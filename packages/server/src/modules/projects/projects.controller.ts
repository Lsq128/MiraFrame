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
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { DRIZZLE, type Db, schema } from "../../db";
import { WsGateway } from "../../ws";
import { eq, desc, asc, inArray } from "drizzle-orm";
import { AgentService } from "../../agent";

// ---- Projects CRUD ----

@Controller("api/v1/projects")
export class ProjectsController {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    @Inject(WsGateway) private readonly wsGateway: WsGateway,
    @Inject(AgentService) private readonly agentService: AgentService,
  ) {}

  @Get()
  async list() {
    return this.db.select().from(schema.projects).orderBy(desc(schema.projects.updatedAt));
  }

  @Get(":id")
  async get(@Param("id") id: string) {
    const [project] = await this.db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.id, parseInt(id)));
    if (!project) return { error: "Not found" };
    return project;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() body: Record<string, unknown>) {
    const [project] = await this.db
      .insert(schema.projects)
      .values({
        title: (body.title as string) || "Untitled",
        story: body.story as string,
        style: (body.style as string) || "anime",
        targetShotCount: body.target_shot_count as number,
        characterHints: body.character_hints as string[],
        creationMode: body.creation_mode as string,
        referenceImages: body.reference_images as string[],
        universeId: body.universe_id as number,
        chapterNumber: body.chapter_number as number,
        chapterTitle: body.chapter_title as string,
        textProviderOverride: body.text_provider_override as string,
        imageProviderOverride: body.image_provider_override as string,
        videoProviderOverride: body.video_provider_override as string,
      })
      .returning();
    return project;
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    const patch: Partial<typeof schema.projects.$inferInsert> = compactUpdate({
      title: body.title as string | undefined,
      story: body.story as string | null | undefined,
      style: body.style as string | undefined,
      summary: body.summary as string | null | undefined,
      status: body.status as string | undefined,
      videoUrl: body.video_url as string | null | undefined,
      targetShotCount: body.target_shot_count as number | null | undefined,
      characterHints: body.character_hints as string[] | undefined,
      creationMode: body.creation_mode as string | null | undefined,
      referenceImages: body.reference_images as string[] | undefined,
      outlineApproved: body.outline_approved as boolean | undefined,
      universeId: body.universe_id as number | null | undefined,
      chapterNumber: body.chapter_number as number | null | undefined,
      chapterTitle: body.chapter_title as string | null | undefined,
      textProviderOverride: body.text_provider_override as string | null | undefined,
      imageProviderOverride: body.image_provider_override as string | null | undefined,
      videoProviderOverride: body.video_provider_override as string | null | undefined,
      updatedAt: new Date(),
    });

    const [project] = await this.db
      .update(schema.projects)
      .set(patch)
      .where(eq(schema.projects.id, parseInt(id)))
      .returning();

    this.wsGateway.sendToProject(parseInt(id), "project_updated", project || {});
    return project;
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param("id") id: string) {
    await this.db.delete(schema.projects).where(eq(schema.projects.id, parseInt(id)));
  }

  @Post("batch-delete")
  @HttpCode(HttpStatus.OK)
  async deleteMany(@Body() body: { ids: number[] }) {
    const ids = [...new Set((body.ids || []).map(Number).filter((id) => Number.isInteger(id) && id > 0))];
    if (ids.length === 0) return { deleted: 0 };
    const deleted = await this.db
      .delete(schema.projects)
      .where(inArray(schema.projects.id, ids))
      .returning({ id: schema.projects.id });
    return { deleted: deleted.length };
  }

  // ---- Characters under project ----

  @Get(":id/characters")
  async getCharacters(@Param("id") id: string) {
    return this.db
      .select()
      .from(schema.characters)
      .where(eq(schema.characters.projectId, parseInt(id)))
      .orderBy(asc(schema.characters.id));
  }

  // ---- Shots under project ----

  @Get(":id/shots")
  async getShots(@Param("id") id: string) {
    return this.db
      .select()
      .from(schema.shots)
      .where(eq(schema.shots.projectId, parseInt(id)))
      .orderBy(asc(schema.shots.order));
  }

  // ---- Messages ----

  @Get(":id/messages")
  async getMessages(@Param("id") id: string) {
    return this.db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.projectId, parseInt(id)))
      .orderBy(asc(schema.messages.createdAt));
  }

  @Get(":id/runs/latest")
  async getLatestRun(@Param("id") id: string) {
    const [run] = await this.db
      .select()
      .from(schema.agentRuns)
      .where(eq(schema.agentRuns.projectId, parseInt(id)))
      .orderBy(desc(schema.agentRuns.createdAt))
      .limit(1);
    return run || null;
  }

  // ---- Outline ----

  @Get(":id/outline")
  async getOutline(@Param("id") id: string) {
    const [project] = await this.db
      .select({ storyOutline: schema.projects.storyOutline, visualBible: schema.projects.visualBible, outlineApproved: schema.projects.outlineApproved })
      .from(schema.projects)
      .where(eq(schema.projects.id, parseInt(id)));
    if (!project?.storyOutline) return null;
    return {
      ...(project.storyOutline as Record<string, unknown>),
      visual_bible: project.visualBible,
      outline_approved: project.outlineApproved,
    };
  }

  @Put(":id/outline")
  async updateOutline(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    const [project] = await this.db
      .update(schema.projects)
      .set({
        storyOutline: body as Record<string, unknown>,
        visualBible: body.visual_bible as string,
        outlineApproved: body.outline_approved as boolean,
        updatedAt: new Date(),
      })
      .where(eq(schema.projects.id, parseInt(id)))
      .returning();

    this.wsGateway.sendToProject(parseInt(id), "outline_updated", {
      project_id: parseInt(id),
      story_outline: body,
      visual_bible: body.visual_bible,
      outline_approved: body.outline_approved,
    });
    return project?.storyOutline || body;
  }

  // ---- Upload reference image ----

  @Post(":id/upload-reference")
  @UseInterceptors(FileInterceptor("file"))
  async uploadReference(@Param("id") id: string, @UploadedFile() file: { filename?: string }) {
    const baseUrl = process.env.STATIC_BASE_URL || "";
    const url = `${baseUrl}/static/uploads/${file?.filename || "upload"}`;

    const [project] = await this.db
      .select({ referenceImages: schema.projects.referenceImages })
      .from(schema.projects)
      .where(eq(schema.projects.id, parseInt(id)));

    const images = [...(project?.referenceImages || []), url];
    await this.db
      .update(schema.projects)
      .set({ referenceImages: images, updatedAt: new Date() })
      .where(eq(schema.projects.id, parseInt(id)));

    return { url, reference_images: images };
  }

  // ---- Feedback ----

  @Post(":id/feedback")
  async feedback(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    const projectId = parseInt(id);
    await this.db.insert(schema.messages).values({
      projectId,
      agent: "user",
      role: "user",
      content: body.content as string,
      createdAt: new Date(),
    });
    return { status: "feedback_received" };
  }

  @Post(":id/revisions")
  @HttpCode(HttpStatus.ACCEPTED)
  async revision(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    const content = String(body.content || "").trim();
    if (!content) return { status: "ignored", reason: "empty_content" };

    const runId = await this.agentService.submitRevision({
      projectId: parseInt(id),
      content,
      feedbackType: typeof body.feedback_type === "string" ? body.feedback_type : undefined,
      entityType: typeof body.entity_type === "string" ? body.entity_type : undefined,
      entityId: typeof body.entity_id === "number" ? body.entity_id : undefined,
    });

    return { status: "revision_queued", run_id: runId };
  }
}

function compactUpdate<T extends Record<string, unknown>>(patch: T): T {
  return Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined)) as T;
}
