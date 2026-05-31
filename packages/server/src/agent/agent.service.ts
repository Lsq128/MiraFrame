import { Injectable, Inject } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { REDIS_CLIENT, REDIS_SUBSCRIBER } from "../redis";
import { DRIZZLE, type Db } from "../db";
import { WsGateway } from "../ws";
import { eq } from "drizzle-orm";
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
export class AgentService {
  constructor(
    @InjectQueue("generation") private readonly generationQueue: Queue,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(REDIS_SUBSCRIBER) private readonly redisSub: Redis,
    @Inject(DRIZZLE) private readonly db: Db,
    @Inject(WsGateway) private readonly wsGateway: WsGateway,
  ) {}

  async startGeneration(input: GenerationInput): Promise<void> {
    // Update agent run status in DB
    await this.db
      .update(schema.agentRuns)
      .set({ status: "running", updatedAt: new Date() })
      .where(eq(schema.agentRuns.id, input.runId));

    // Notify frontend
    this.wsGateway.sendToProject(input.projectId, "run_started", {
      run_id: input.runId,
      project_id: input.projectId,
      stage: input.targetStage || "plan_outline",
      progress: 0,
    });

    // Enqueue the graph execution job
    await this.generationQueue.add("execute-graph", input, {
      jobId: `generation:${input.projectId}:${input.runId}`,
    });
  }

  async cancelGeneration(projectId: number, runId: number): Promise<void> {
    // Remove pending jobs
    const jobs = await this.generationQueue.getJobs(["waiting", "active", "delayed"]);
    for (const job of jobs) {
      if (job.data.projectId === projectId && job.data.runId === runId) {
        await job.remove();
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
