import { Controller, Post, Param, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { AgentService } from "../../agent";

@Controller("api/v1/projects/:projectId")
export class GenerationController {
  constructor(private readonly agentService: AgentService) {}

  @Post("generate")
  @HttpCode(HttpStatus.ACCEPTED)
  async generate(
    @Param("projectId") projectId: string,
    @Body() body: { auto_mode?: boolean; target_stage?: string },
  ) {
    const runId = Date.now(); // Placeholder - in real app, create AgentRun in DB first
    const threadId = `thread-${projectId}-${runId}`;

    await this.agentService.startGeneration({
      projectId: parseInt(projectId),
      runId,
      threadId,
      mode: "full",
      autoMode: body.auto_mode || false,
      targetStage: body.target_stage,
    });

    return {
      run_id: runId,
      thread_id: threadId,
      status: "queued",
    };
  }

  @Post("generate/:runId/cancel")
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param("projectId") projectId: string,
    @Param("runId") runId: string,
  ) {
    await this.agentService.cancelGeneration(parseInt(projectId), parseInt(runId));
    return { status: "cancelled" };
  }

  @Post("generate/:runId/resume")
  @HttpCode(HttpStatus.ACCEPTED)
  async resume(
    @Param("projectId") projectId: string,
    @Param("runId") runId: string,
    @Body() body: { confirm?: boolean; feedback?: string },
  ) {
    // Publish confirm signal to Redis to resume the interrupted graph
    const Redis = (await import("ioredis")).default;
    const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379/0");
    await redis.publish(
      `generation:${projectId}:${runId}`,
      JSON.stringify({
        action: body.confirm ? "confirm" : "cancel",
        feedback: body.feedback,
      }),
    );
    redis.disconnect();
    return { status: "resumed" };
  }

  @Post("generate/:runId/feedback")
  @HttpCode(HttpStatus.OK)
  async feedback(
    @Param("projectId") projectId: string,
    @Param("runId") runId: string,
    @Body() body: { feedback: string; feedback_type?: string },
  ) {
    await this.agentService.sendFeedback(
      parseInt(projectId),
      parseInt(runId),
      body.feedback,
      body.feedback_type,
    );
    return { status: "feedback_received" };
  }
}
