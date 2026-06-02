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

// ---- Projects CRUD ----

@Controller("api/v1/projects")
export class ProjectsController {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    @Inject(WsGateway) private readonly wsGateway: WsGateway,
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
    const [project] = await this.db
      .update(schema.projects)
      .set({
        title: body.title as string,
        story: body.story as string,
        style: body.style as string,
        summary: body.summary as string,
        status: body.status as string,
        videoUrl: body.video_url as string,
        targetShotCount: body.target_shot_count as number,
        characterHints: body.character_hints as string[],
        creationMode: body.creation_mode as string,
        referenceImages: body.reference_images as string[],
        outlineApproved: body.outline_approved as boolean,
        universeId: body.universe_id as number,
        chapterNumber: body.chapter_number as number,
        chapterTitle: body.chapter_title as string,
        textProviderOverride: body.text_provider_override as string,
        imageProviderOverride: body.image_provider_override as string,
        videoProviderOverride: body.video_provider_override as string,
        updatedAt: new Date(),
      } as never)
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
}
