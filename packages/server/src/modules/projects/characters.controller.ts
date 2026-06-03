import {
  Controller,
  Get,
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
import { eq } from "drizzle-orm";

@Controller("api/v1/characters")
export class CharactersController {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    @Inject(WsGateway) private readonly wsGateway: WsGateway,
    @Inject(AgentService) private readonly agentService: AgentService,
  ) {}

  @Put(":id")
  async update(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    const patch: Partial<typeof schema.characters.$inferInsert> = compactUpdate({
      name: body.name as string | undefined,
      description: body.description as string | undefined,
      imageUrl: body.image_url as string | null | undefined,
      visualNotes: body.visual_notes as string | null | undefined,
      referenceImages: body.reference_images as string[] | undefined,
      updatedAt: new Date(),
    });

    const [character] = await this.db
      .update(schema.characters)
      .set(patch)
      .where(eq(schema.characters.id, parseInt(id)))
      .returning();

    if (character) {
      this.wsGateway.sendToProject(character.projectId, "character_updated", { character });
    }
    return character;
  }

  @Post(":id/approve")
  @HttpCode(HttpStatus.OK)
  async approve(@Param("id") id: string) {
    const [character] = await this.db
      .select()
      .from(schema.characters)
      .where(eq(schema.characters.id, parseInt(id)));
    if (!character) return { error: "Not found" };

    const [updated] = await this.db
      .update(schema.characters)
      .set({
        approvedName: character.name,
        approvedDescription: character.description,
        approvedImageUrl: character.imageUrl,
        approvedAt: new Date(),
        approvalVersion: (character.approvalVersion || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(schema.characters.id, parseInt(id)))
      .returning();

    this.wsGateway.sendToProject(character.projectId, "character_updated", { character: updated });
    return updated;
  }

  @Post(":id/regenerate")
  @HttpCode(HttpStatus.ACCEPTED)
  async regenerate(@Param("id") id: string) {
    const characterId = parseInt(id);
    const [character] = await this.db
      .select({ projectId: schema.characters.projectId, name: schema.characters.name })
      .from(schema.characters)
      .where(eq(schema.characters.id, characterId));
    if (!character) return { error: "Not found" };

    const runId = await this.agentService.submitRevision({
      projectId: character.projectId,
      content: `重新生成角色「${character.name}」的角色图，保持角色设定一致。`,
      entityType: "character",
      entityId: characterId,
      feedbackType: "regenerate_image",
    });

    return { status: "queued", character_id: characterId, project_id: character.projectId, run_id: runId };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param("id") id: string) {
    const [character] = await this.db
      .select({ projectId: schema.characters.projectId })
      .from(schema.characters)
      .where(eq(schema.characters.id, parseInt(id)));

    await this.db.delete(schema.characters).where(eq(schema.characters.id, parseInt(id)));

    if (character) {
      this.wsGateway.sendToProject(character.projectId, "character_deleted", {
        character_id: parseInt(id),
      });
    }
  }

  @Get(":id/bible")
  async getBible(@Param("id") id: string) {
    const [character] = await this.db
      .select({
        id: schema.characters.id,
        visualNotes: schema.characters.visualNotes,
        referenceImages: schema.characters.referenceImages,
      })
      .from(schema.characters)
      .where(eq(schema.characters.id, parseInt(id)));
    return character || { error: "Not found" };
  }

  @Put(":id/bible")
  async updateBible(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    const patch: Partial<typeof schema.characters.$inferInsert> = compactUpdate({
      visualNotes: body.visual_notes as string | null | undefined,
      referenceImages: body.reference_images as string[] | undefined,
      updatedAt: new Date(),
    });

    const [character] = await this.db
      .update(schema.characters)
      .set(patch)
      .where(eq(schema.characters.id, parseInt(id)))
      .returning();

    if (character) {
      this.wsGateway.sendToProject(character.projectId, "bible_updated", {
        character_id: parseInt(id),
      });
    }
    return character;
  }

  @Post(":id/reference-images")
  async addReferenceImage(@Param("id") id: string, @Body() body: { image_url: string }) {
    const [character] = await this.db
      .select()
      .from(schema.characters)
      .where(eq(schema.characters.id, parseInt(id)));
    if (!character) return { error: "Not found" };

    const images = [...(character.referenceImages || []), body.image_url];
    const [updated] = await this.db
      .update(schema.characters)
      .set({ referenceImages: images, updatedAt: new Date() })
      .where(eq(schema.characters.id, parseInt(id)))
      .returning();
    return updated;
  }

  @Delete(":id/reference-images/:index")
  async deleteReferenceImage(@Param("id") id: string, @Param("index") index: string) {
    const idx = parseInt(index);
    const [character] = await this.db
      .select()
      .from(schema.characters)
      .where(eq(schema.characters.id, parseInt(id)));
    if (!character?.referenceImages) return;

    const images = character.referenceImages.filter((_, i) => i !== idx);
    await this.db
      .update(schema.characters)
      .set({ referenceImages: images, updatedAt: new Date() })
      .where(eq(schema.characters.id, parseInt(id)));
  }

  @Post(":id/compute-embedding")
  async computeEmbedding(@Param("id") id: string) {
    return { status: "queued", character_id: parseInt(id) };
  }
}

function compactUpdate<T extends Record<string, unknown>>(patch: T): T {
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as T;
}
