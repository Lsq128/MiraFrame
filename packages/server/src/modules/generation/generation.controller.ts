import { Controller, Post, Param, Body, HttpCode, HttpStatus, Inject } from "@nestjs/common";
import Redis from "ioredis";
import { REDIS_CLIENT } from "../../redis";
import { AgentService } from "../../agent/agent.service";
import { DRIZZLE, type Db, schema } from "../../db";
import { desc, eq } from "drizzle-orm";
import { WsGateway } from "../../ws";

@Controller("api/v1/projects/:projectId")
export class GenerationController {
  constructor(
    @Inject(AgentService) private readonly agentService: AgentService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(DRIZZLE) private readonly db: Db,
    @Inject(WsGateway) private readonly wsGateway: WsGateway,
  ) {}

  @Post("generate")
  @HttpCode(HttpStatus.ACCEPTED)
  async generate(
    @Param("projectId") projectId: string,
    @Body() body: { auto_mode?: boolean; target_stage?: string },
  ) {
    const runId = await this.agentService.startGeneration({
      projectId: parseInt(projectId),
      mode: "full",
      autoMode: body.auto_mode || false,
      targetStage: body.target_stage,
    });

    return {
      run_id: runId,
      status: "queued",
    };
  }

  @Post("generate/cancel")
  @HttpCode(HttpStatus.OK)
  async cancelLatest(@Param("projectId") projectIdParam: string) {
    const projectId = parseInt(projectIdParam);
    const recentRuns = await this.db
      .select({ id: schema.agentRuns.id, status: schema.agentRuns.status })
      .from(schema.agentRuns)
      .where(eq(schema.agentRuns.projectId, projectId))
      .orderBy(desc(schema.agentRuns.createdAt))
      .limit(5);
    const cancellableRun = recentRuns.find((run) => run.status === "running" || run.status === "queued");
    if (!cancellableRun) return { status: "cancelled", cancelled: 0 };

    await this.agentService.cancelGeneration(projectId, cancellableRun.id);
    return { status: "cancelled", cancelled: 1, run_id: cancellableRun.id };
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
    // Use injected Redis client (no manual connection)
    await this.redis.publish(
      `generation:${projectId}:${runId}`,
      JSON.stringify({
        action: body.confirm ? "confirm" : "cancel",
        feedback: body.feedback,
      }),
    );
    this.wsGateway.sendToProject(parseInt(projectId), "run_confirmed", {
      run_id: parseInt(runId),
      project_id: parseInt(projectId),
    });
    return { status: "resumed" };
  }

  @Post("approve-outline")
  @HttpCode(HttpStatus.ACCEPTED)
  async approveOutline(
    @Param("projectId") projectIdParam: string,
    @Body() body: { feedback?: string },
  ) {
    const projectId = parseInt(projectIdParam);

    // If feedback is provided, regenerate outline instead of approving
    if (body.feedback && body.feedback.trim().length > 0) {
      const [project] = await this.db
        .select({ story: schema.projects.story })
        .from(schema.projects)
        .where(eq(schema.projects.id, projectId));

      // Append feedback to the story context for regeneration
      const enhancedStory = (project?.story || "") + "\n\n[用户反馈]\n" + body.feedback;

      // Ensure outline_approved is false before regenerating
      await this.db
        .update(schema.projects)
        .set({ outlineApproved: false, updatedAt: new Date() })
        .where(eq(schema.projects.id, projectId));

      // Start a new generation run from plan_outline to regenerate the outline
      const runId = await this.agentService.startGeneration({
        projectId,
        mode: "full",
        autoMode: false,
        targetStage: "plan_outline",
      });

      this.wsGateway.sendToProject(projectId, "outline_updated", {
        project_id: projectId,
        story_outline: null,
        visual_bible: null,
        outline_approved: false,
      });

      return {
        status: "regenerating",
        action: "regenerate",
        run_id: runId,
        feedback: body.feedback,
      };
    }
    try {
      const [project] = await this.db
        .update(schema.projects)
        .set({ outlineApproved: true, updatedAt: new Date() })
        .where(eq(schema.projects.id, projectId))
        .returning({
          storyOutline: schema.projects.storyOutline,
          visualBible: schema.projects.visualBible,
          outlineApproved: schema.projects.outlineApproved,
        });

      this.wsGateway.sendToProject(projectId, "outline_updated", {
        project_id: projectId,
        story_outline: project?.storyOutline ?? null,
        visual_bible: project?.visualBible ?? null,
        outline_approved: true,
      });
      this.wsGateway.sendToProject(projectId, "project_updated", {
        outline_approved: true,
      });

      const runId = await this.agentService.startGeneration({
        projectId,
        mode: "full",
        autoMode: false,
        targetStage: "plan_characters",
      });

      return {
        status: "approved",
        action: "started",
        run_id: runId,
        resumed: false,
      };
    } catch (error) {
      console.error("[generation] approve-outline failed:", error);
      throw error;
    }
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
