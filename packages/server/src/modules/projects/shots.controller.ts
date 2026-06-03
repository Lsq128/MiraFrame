import {
  Controller,
  Post,
  Put,
  Delete,
  Param,
  Body,
  HttpCode,
  HttpStatus,
  Inject,
} from "@nestjs/common";
import { DRIZZLE, type Db, schema } from "../../db";
import { WsGateway } from "../../ws";
import { AgentService } from "../../agent";
import { eq, asc } from "drizzle-orm";

@Controller("api/v1/shots")
export class ShotsController {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    @Inject(WsGateway) private readonly wsGateway: WsGateway,
    @Inject(AgentService) private readonly agentService: AgentService,
  ) {}

  @Put(":id")
  async update(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    const patch: Partial<typeof schema.shots.$inferInsert> = compactUpdate({
      order: body.order as number | undefined,
      description: body.description as string | undefined,
      prompt: body.prompt as string | null | undefined,
      imagePrompt: body.image_prompt as string | null | undefined,
      duration: body.duration as number | null | undefined,
      camera: body.camera as string | null | undefined,
      motionNote: body.motion_note as string | null | undefined,
      scene: body.scene as string | null | undefined,
      action: body.action as string | null | undefined,
      expression: body.expression as string | null | undefined,
      lighting: body.lighting as string | null | undefined,
      dialogue: body.dialogue as string | null | undefined,
      sfx: body.sfx as string | null | undefined,
      seed: body.seed as number | null | undefined,
      characterIds: body.character_ids as number[] | undefined,
      updatedAt: new Date(),
    });

    const [shot] = await this.db
      .update(schema.shots)
      .set(patch)
      .where(eq(schema.shots.id, parseInt(id)))
      .returning();

    if (shot) {
      this.wsGateway.sendToProject(shot.projectId, "shot_updated", { shot });
    }
    return shot;
  }

  @Post(":id/approve")
  @HttpCode(HttpStatus.OK)
  async approve(@Param("id") id: string) {
    const [shot] = await this.db
      .select()
      .from(schema.shots)
      .where(eq(schema.shots.id, parseInt(id)));
    if (!shot) return { error: "Not found" };

    const [updated] = await this.db
      .update(schema.shots)
      .set({
        approvedDescription: shot.description,
        approvedPrompt: shot.prompt,
        approvedImagePrompt: shot.imagePrompt,
        approvedDuration: shot.duration,
        approvedCamera: shot.camera,
        approvedMotionNote: shot.motionNote,
        approvedScene: shot.scene,
        approvedAction: shot.action,
        approvedExpression: shot.expression,
        approvedLighting: shot.lighting,
        approvedDialogue: shot.dialogue,
        approvedSfx: shot.sfx,
        approvedCharacterIds: shot.characterIds,
        approvedAt: new Date(),
        approvalVersion: (shot.approvalVersion || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(schema.shots.id, parseInt(id)))
      .returning();

    this.wsGateway.sendToProject(shot.projectId, "shot_updated", { shot: updated });
    return updated;
  }

  @Post(":id/regenerate")
  @HttpCode(HttpStatus.ACCEPTED)
  async regenerate(@Param("id") id: string, @Body() body: { type?: string }) {
    const shotId = parseInt(id);
    const [shot] = await this.db
      .select({ projectId: schema.shots.projectId, order: schema.shots.order })
      .from(schema.shots)
      .where(eq(schema.shots.id, shotId));
    if (!shot) return { error: "Not found" };

    const type = body.type === "video" ? "video" : "image";
    const runId = await this.agentService.submitRevision({
      projectId: shot.projectId,
      content: type === "video"
        ? `重新生成镜头 ${shot.order} 的视频，保持分镜含义一致。`
        : `重新生成镜头 ${shot.order} 的首帧画面，保持分镜含义一致。`,
      entityType: "shot",
      entityId: shotId,
      feedbackType: type === "video" ? "regenerate_video" : "regenerate_image",
    });

    return {
      status: "queued",
      shot_id: shotId,
      project_id: shot.projectId,
      type,
      run_id: runId,
    };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param("id") id: string) {
    const [shot] = await this.db
      .select({ projectId: schema.shots.projectId })
      .from(schema.shots)
      .where(eq(schema.shots.id, parseInt(id)));

    await this.db.delete(schema.shots).where(eq(schema.shots.id, parseInt(id)));

    if (shot) {
      // Reorder remaining shots
      const remaining = await this.db
        .select()
        .from(schema.shots)
        .where(eq(schema.shots.projectId, shot.projectId))
        .orderBy(asc(schema.shots.order));

      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].order !== i) {
          await this.db
            .update(schema.shots)
            .set({ order: i, updatedAt: new Date() })
            .where(eq(schema.shots.id, remaining[i].id));
        }
      }

      this.wsGateway.sendToProject(shot.projectId, "shot_deleted", {
        shot_id: parseInt(id),
      });
    }
  }
}

function compactUpdate<T extends Record<string, unknown>>(patch: T): T {
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as T;
}
