import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Inject, Injectable } from "@nestjs/common";
import Redis from "ioredis";
import { REDIS_CLIENT, REDIS_SUBSCRIBER } from "../redis";
import { DRIZZLE, type Db } from "../db";
import { WsGateway } from "../ws";
import { TextService } from "../services";
import { buildPhase2Graph } from "@openoii/agent";
import type { Phase2StateType } from "@openoii/agent";
import { MemorySaver, Command } from "@langchain/langgraph";
import { eq } from "drizzle-orm";
import { schema } from "../db";
import type { GenerationInput } from "./agent.service";

@Processor("generation")
@Injectable()
export class AgentProcessor extends WorkerHost {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(REDIS_SUBSCRIBER) private readonly redisSub: Redis,
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly wsGateway: WsGateway,
    private readonly textService: TextService,
  ) {
    super();
  }

  async process(job: Job<GenerationInput>): Promise<void> {
    const { projectId, runId, threadId } = job.data;
    console.log(`Processing generation job: project=${projectId}, run=${runId}`);

    // Build the graph with checkpointer
    const graph = buildPhase2Graph();
    const checkpointer = new MemorySaver(); // In production: PostgresSaver
    const compiled = graph.compile({ checkpointer });

    const config = { configurable: { thread_id: threadId } };

    // Build agent context
    const ctx = {
      projectId,
      runId,
      threadId,
      sendMessage: async (content: string, opts?: { summary?: string; progress?: number; isLoading?: boolean }) => {
        // Save message to DB
        await this.db.insert(schema.messages).values({
          projectId,
          runId,
          agent: "system",
          role: "assistant",
          content,
          summary: opts?.summary || null,
          progress: opts?.progress || null,
          isLoading: opts?.isLoading || false,
          createdAt: new Date(),
        });

        // Send via WebSocket
        this.wsGateway.sendToProject(projectId, "run_message", {
          agent: "system",
          role: "assistant",
          content,
          summary: opts?.summary,
          progress: opts?.progress,
          isLoading: opts?.isLoading,
        });

        // Update run progress in DB
        if (opts?.progress !== undefined) {
          await this.db
            .update(schema.agentRuns)
            .set({ progress: opts.progress, updatedAt: new Date() })
            .where(eq(schema.agentRuns.id, runId));
        }
      },
      sendThinking: async (phase: string, content: string, details?: string) => {
        this.wsGateway.sendToProject(projectId, "agent_thinking", {
          agent: "system",
          phase,
          content,
          details,
        });
      },
      callLlm: async (systemPrompt: string, userPrompt: string, opts?: { maxTokens?: number }) => {
        return this.textService.generate(userPrompt, opts);
      },
    };

    // Initial state typed to match graph expectations
    const initialState: Phase2StateType = {
      projectId: String(projectId),
      runId: String(runId),
      threadId,
      currentStage: "plan_outline",
      nextStage: null,
      stageHistory: [],
      approvalHistory: {},
      critiqueScores: {},
      critiqueRound: 0,
      artifactLineage: {},
      routeStage: null,
      routeMode: "full",
      reviewRequested: false,
    };

    try {
      // Execute the graph
      let currentState: Phase2StateType = initialState;
      let isComplete = false;

      while (!isComplete) {
        try {
          const result = await compiled.invoke(currentState, config);
          currentState = result;
          isComplete = true;

          // Mark run as succeeded
          await this.db
            .update(schema.agentRuns)
            .set({ status: "succeeded", progress: 1.0, updatedAt: new Date() })
            .where(eq(schema.agentRuns.id, runId));

          this.wsGateway.sendToProject(projectId, "run_completed", {
            run_id: runId,
            project_id: projectId,
            message: "Generation completed",
          });
        } catch (error: unknown) {
          // Check if this is an interrupt (approval gate)
          const errorMessage = error instanceof Error ? error.message : String(error);

          if (errorMessage.includes("interrupt") || errorMessage.includes("Interrupt")) {
            // Graph paused at an approval gate
            this.wsGateway.sendToProject(projectId, "run_awaiting_confirm", {
              run_id: runId,
              project_id: projectId,
              agent: "system",
              gate: currentState.currentStage,
              question: "Please confirm to proceed",
              auto_mode: false,
            });

            // Wait for confirm signal via Redis
            const confirmed = await this.waitForConfirm(projectId, runId, 30 * 60 * 1000); // 30 min timeout

            if (confirmed) {
              // Resume with Command
              const resumeCommand = new Command({ resume: true });
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const resumeResult = await compiled.invoke(resumeCommand as any, config);
              currentState = resumeResult;
            } else {
              throw new Error("Approval timeout");
            }
          } else {
            // Real error
            await this.db
              .update(schema.agentRuns)
              .set({ status: "failed", error: errorMessage, updatedAt: new Date() })
              .where(eq(schema.agentRuns.id, runId));

            this.wsGateway.sendToProject(projectId, "run_failed", {
              run_id: runId,
              project_id: projectId,
              error: errorMessage,
            });
            throw error;
          }
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Generation failed for run ${runId}:`, errorMessage);
      throw error;
    }
  }

  private waitForConfirm(projectId: number, runId: number, timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      const channel = `generation:${projectId}:${runId}`;
      const timer = setTimeout(() => {
        this.redisSub.unsubscribe(channel);
        resolve(false);
      }, timeoutMs);

      this.redisSub.subscribe(channel, (err) => {
        if (err) {
          clearTimeout(timer);
          resolve(false);
          return;
        }

        this.redisSub.on("message", (msgChannel, message) => {
          if (msgChannel === channel) {
            try {
              const data = JSON.parse(message);
              if (data.action === "confirm") {
                clearTimeout(timer);
                this.redisSub.unsubscribe(channel);
                resolve(true);
              } else if (data.action === "cancel") {
                clearTimeout(timer);
                this.redisSub.unsubscribe(channel);
                resolve(false);
              }
            } catch {
              // ignore parse errors
            }
          }
        });
      });
    });
  }
}
