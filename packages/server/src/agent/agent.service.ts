import { Injectable, Inject, OnApplicationBootstrap } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { REDIS_CLIENT, REDIS_SUBSCRIBER } from "../redis";
import { DRIZZLE, type Db } from "../db";
import { WsGateway } from "../ws";
import { and, eq, inArray, lt } from "drizzle-orm";
import { schema } from "../db";

export interface GenerationInput {
  projectId: number;
  runId: number;
  threadId: string;
  mode: "full" | "incremental";
  autoMode?: boolean;
  targetStage?: string;
}

@Injectable()
export class AgentService implements OnApplicationBootstrap {
  constructor(
    @InjectQueue("generation") private readonly generationQueue: Queue,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(REDIS_SUBSCRIBER) private readonly redisSub: Redis,
    @Inject(DRIZZLE) private readonly db: Db,
    @Inject(WsGateway) private readonly wsGateway: WsGateway,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.cancelStaleRuns();
  }

  private async cancelStaleRuns(): Promise<void> {
    const staleBefore = new Date(Date.now() - 30 * 60 * 1000);
    const staleRuns = await this.db
      .select({
        id: schema.agentRuns.id,
        projectId: schema.agentRuns.projectId,
        threadId: schema.agentRuns.threadId,
      })
      .from(schema.agentRuns)
      .where(
        and(
          inArray(schema.agentRuns.status, ["queued", "running"]),
          lt(schema.agentRuns.updatedAt, staleBefore),
        ),
      );

    if (!staleRuns.length) return;

    const staleRunIds = new Set(staleRuns.map((run) => run.id));
    console.warn(`[agent] Cancelling ${staleRuns.length} stale generation run(s) before ${staleBefore.toISOString()}`);

    for (const run of staleRuns) {
      await this.redis.publish(`generation:${run.projectId}:${run.id}`, JSON.stringify({ action: "cancel" }));
    }

    const jobs = await this.generationQueue.getJobs(["waiting", "active", "delayed"]);
    for (const job of jobs) {
      if (staleRunIds.has(job.data.runId)) {
        try {
          await job.remove();
        } catch (err) {
          console.warn(`[agent] Could not remove stale job ${job.id}:`, err);
        }
      }
    }

    await this.db
      .update(schema.agentRuns)
      .set({
        status: "cancelled",
        error: "Stale generation run cancelled on server startup",
        updatedAt: new Date(),
      })
      .where(inArray(schema.agentRuns.id, Array.from(staleRunIds)));
  }

  async startGeneration(input: Omit<GenerationInput, "runId" | "threadId">): Promise<number> {
    await this.cancelActiveRunsForProject(input.projectId);

    // INSERT — let DB auto-generate the serial id
    const [row] = await this.db
      .insert(schema.agentRuns)
      .values({
        projectId: input.projectId,
        status: "queued",
        progress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: schema.agentRuns.id });

    if (!row) throw new Error("Failed to create agent run");
    const runId = row.id;
    const threadId = `thread-${input.projectId}-${runId}`;

    // Update with threadId
    await this.db
      .update(schema.agentRuns)
      .set({ threadId, updatedAt: new Date() })
      .where(eq(schema.agentRuns.id, runId));

    // Notify frontend
    this.wsGateway.sendToProject(input.projectId, "run_started", {
      run_id: runId,
      project_id: input.projectId,
      stage: input.targetStage || "plan_outline",
      progress: 0,
    });

    // Enqueue the graph execution job
    const fullInput: GenerationInput = { ...input, runId, threadId };
    try {
      await this.generationQueue.add("execute-graph", fullInput, {
        jobId: `generation:${input.projectId}:${runId}`,
      });
      await this.db
        .update(schema.agentRuns)
        .set({ status: "running", updatedAt: new Date() })
        .where(eq(schema.agentRuns.id, runId));
    } catch (err) {
      console.error("Failed to enqueue generation job:", err);
      await this.db
        .update(schema.agentRuns)
        .set({ status: "failed", error: String(err), updatedAt: new Date() })
        .where(eq(schema.agentRuns.id, runId));
      throw err;
    }

    return runId;
  }

  async cancelGeneration(projectId: number, runId: number): Promise<void> {
    // Remove pending jobs
    const jobs = await this.generationQueue.getJobs(["waiting", "active", "delayed"]);
    for (const job of jobs) {
      if (job.data.projectId === projectId && job.data.runId === runId) {
        try {
          await job.remove();
        } catch (err) {
          console.warn(`[agent] Could not remove job ${job.id} for run=${runId}:`, err);
        }
      }
    }

    // Publish cancel signal via Redis
    await this.redis.publish(`generation:${projectId}:${runId}`, JSON.stringify({ action: "cancel" }));

    // Update DB
    await this.db
      .update(schema.agentRuns)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(schema.agentRuns.id, runId));

    this.wsGateway.sendToProject(projectId, "run_cancelled", {
      run_id: runId,
      project_id: projectId,
    });
  }

  private async cancelActiveRunsForProject(projectId: number): Promise<void> {
    const activeRuns = await this.db
      .select({ id: schema.agentRuns.id })
      .from(schema.agentRuns)
      .where(
        and(
          eq(schema.agentRuns.projectId, projectId),
          inArray(schema.agentRuns.status, ["queued", "running"]),
        ),
      );

    for (const run of activeRuns) {
      await this.cancelGeneration(projectId, run.id);
    }
  }

  async sendFeedback(projectId: number, runId: number, feedback: string, feedbackType?: string): Promise<void> {
    await this.redis.publish(
      `generation:${projectId}:${runId}`,
      JSON.stringify({ action: "feedback", feedback, feedbackType }),
    );

    // Save feedback as a message in DB
    await this.db.insert(schema.messages).values({
      projectId,
      runId,
      agent: "user",
      role: "user",
      content: feedback,
      createdAt: new Date(),
    });
  }
}
