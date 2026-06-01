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
import { eq, asc } from "drizzle-orm";

@Controller("api/v1/shots")
export class ShotsController {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly wsGateway: WsGateway,
  ) {}

  @Put(":id")
  async update(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    const [shot] = await this.db
      .update(schema.shots)
      .set({
        order: body.order as number,
        description: body.description as string,
        prompt: body.prompt as string,
        imagePrompt: body.image_prompt as string,
        duration: body.duration as number,
        camera: body.camera as string,
        motionNote: body.motion_note as string,
        scene: body.scene as string,
        action: body.action as string,
        expression: body.expression as string,
        lighting: body.lighting as string,
        dialogue: body.dialogue as string,
        sfx: body.sfx as string,
        seed: body.seed as number,
        characterIds: body.character_ids as number[],
        updatedAt: new Date(),
      })
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
    const [shot] = await this.db
      .select({ projectId: schema.shots.projectId })
      .from(schema.shots)
      .where(eq(schema.shots.id, parseInt(id)));

    return {
      status: "queued",
      shot_id: parseInt(id),
      project_id: shot?.projectId,
      type: body.type || "image",
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
