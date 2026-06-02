import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { Inject, Injectable } from "@nestjs/common";
import Redis from "ioredis";
import { REDIS_CLIENT, REDIS_SUBSCRIBER } from "../redis";
import { DRIZZLE, type Db } from "../db";
import { WsGateway } from "../ws";
import { ImageService, TextService, VideoService } from "../services";
import { buildPhase2Graph, setNodeContext, clearNodeContext, runWithNodeContext } from "@openoii/agent";
import type { Phase2StateType } from "@openoii/agent";
import { MemorySaver, Command, INTERRUPT, isInterrupted } from "@langchain/langgraph";
import { and, asc, eq } from "drizzle-orm";
import { schema } from "../db";
import type { GenerationInput } from "./agent.service";

@Processor("generation", { concurrency: 8 })
@Injectable()
export class AgentProcessor extends WorkerHost {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(REDIS_SUBSCRIBER) private readonly redisSub: Redis,
	    @Inject(DRIZZLE) private readonly db: Db,
	    @Inject(WsGateway) private readonly wsGateway: WsGateway,
	    @Inject(TextService) private readonly textService: TextService,
	    @Inject(ImageService) private readonly imageService: ImageService,
	    @Inject(VideoService) private readonly videoService: VideoService,
	  ) {
    super();
  }

  async process(job: Job<GenerationInput>): Promise<void> {
    const { projectId, runId, threadId } = job.data;
    console.log(`[processor] === Starting generation job ===`);
    console.log(`[processor] projectId=${projectId} runId=${runId} threadId=${threadId}`);

    const [run] = await this.db
      .select({ status: schema.agentRuns.status })
      .from(schema.agentRuns)
      .where(eq(schema.agentRuns.id, runId));
    if (run && run.status !== "running" && run.status !== "queued") {
      console.log(`[processor] Skipping run=${runId}; status=${run.status}`);
      return;
    }

    // Build the graph with checkpointer
    console.log(`[processor] Building graph...`);
    const graph = buildPhase2Graph();
    const checkpointer = new MemorySaver();
    const compiled = graph.compile({ checkpointer });
    console.log(`[processor] Graph compiled with ${Object.keys(graph).length} nodes`);

    const config = { configurable: { thread_id: threadId } };
    const [project] = await this.db
      .select({
        title: schema.projects.title,
        story: schema.projects.story,
        style: schema.projects.style,
        targetShotCount: schema.projects.targetShotCount,
        storyOutline: schema.projects.storyOutline,
        visualBible: schema.projects.visualBible,
      })
      .from(schema.projects)
      .where(eq(schema.projects.id, projectId));

    const projectContext = [
      `Project title: ${project?.title || `Project ${projectId}`}`,
      `Visual style: ${project?.style || "anime"}`,
      `Target shot count: ${project?.targetShotCount || 4}`,
      project?.visualBible ? `Visual bible:\n${project.visualBible}` : null,
      project?.storyOutline ? `Approved outline JSON:\n${JSON.stringify(project.storyOutline)}` : null,
      "Story brief:",
      project?.story || "No story brief provided.",
    ]
      .filter(Boolean)
      .join("\n");
    let latestOutline: Record<string, unknown> | null = project?.storyOutline || null;
    let latestVisualBible: string | null = project?.visualBible || null;

    // ---- Build the REAL agent context ----
    const ctx = {
      projectId,
      runId,
      threadId,
      sendMessage: async (content: string, opts?: { summary?: string; progress?: number; isLoading?: boolean; stage?: string }) => {
        console.log(`[processor:msg] content="${content.substring(0, 80)}..." progress=${opts?.progress ?? "N/A"} stage=${opts?.stage ?? "N/A"}`);
        try {
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
        } catch (dbErr) {
          console.error(`[processor:msg] DB insert failed:`, dbErr);
        }

        // Send run_message for chat panel
        this.wsGateway.sendToProject(projectId, "run_message", {
          agent: "system",
          role: "assistant",
          content,
          summary: opts?.summary,
          progress: opts?.progress,
          isLoading: opts?.isLoading,
        });

        // Also send run_progress for pipeline stage tracking
        if (opts?.progress !== undefined || opts?.stage) {
          const stage = opts?.stage || "plan_outline";
          // Map stage to progress value (matching old project's workflow_progress_for_stage)
          this.wsGateway.sendToProject(projectId, "run_progress", {
            run_id: runId,
            project_id: projectId,
            current_agent: "system",
            current_stage: stage,
            stage,
            progress: opts?.progress || 0,
          });

          await this.db
            .update(schema.agentRuns)
            .set({ progress: opts.progress ?? 0, currentAgent: stage, updatedAt: new Date() })
            .where(eq(schema.agentRuns.id, runId));
        }
      },

      sendThinking: async (phase: string, content: string, details?: string) => {
        console.log(`[processor:thinking] phase="${phase}" content="${content.substring(0, 60)}..."`);
        this.wsGateway.sendToProject(projectId, "agent_thinking", {
          agent: "system",
          phase,
          content,
          details,
        });
      },

      callLlm: async (systemPrompt: string, userPrompt: string, opts?: { maxTokens?: number }) => {
        console.log(`[processor:llm] Calling LLM...`);
        console.log(`[processor:llm] systemPrompt (first 120 chars): ${systemPrompt.substring(0, 120)}`);
        console.log(`[processor:llm] userPrompt (first 120 chars): ${userPrompt.substring(0, 120)}`);
        try {
          const promptWithProject = `${projectContext}\n\nTask:\n${userPrompt}`;
          const result = await this.textService.generate(promptWithProject, {
            ...opts,
            systemPrompt,
          });
          console.log(`[processor:llm] Response (first 200 chars): ${result.substring(0, 200)}`);
          return result;
        } catch (err) {
          console.error(`[processor:llm] FAILED:`, err);
          throw err;
        }
      },

      saveOutline: async (outline: Record<string, unknown>, visualBible?: string | null) => {
        console.log(`[processor:db] Saving story outline`);
        latestOutline = outline;
        latestVisualBible = visualBible || null;
        await this.db
          .update(schema.projects)
          .set({
            storyOutline: outline,
            visualBible: visualBible || null,
            updatedAt: new Date(),
          })
          .where(eq(schema.projects.id, projectId));

        this.wsGateway.sendToProject(projectId, "outline_updated", {
          project_id: projectId,
          story_outline: outline,
          visual_bible: visualBible || null,
          outline_approved: false,
        });
      },

      createCharacter: async (char: { name: string; description: string }) => {
        console.log(`[processor:db] Creating character: "${char.name}"`);
        const [existing] = await this.db
          .select()
          .from(schema.characters)
          .where(and(eq(schema.characters.projectId, projectId), eq(schema.characters.name, char.name)))
          .orderBy(asc(schema.characters.id))
          .limit(1);

        if (existing) {
          const [updated] = await this.db
            .update(schema.characters)
            .set({
              description: char.description || existing.description,
              updatedAt: new Date(),
            })
            .where(eq(schema.characters.id, existing.id))
            .returning();

          if (updated) {
            this.wsGateway.sendToProject(projectId, "character_updated", {
              character: toCharacterPayload(updated),
            });
          }

          return updated || existing;
        }

        const [record] = await this.db
          .insert(schema.characters)
          .values({
            projectId,
            name: char.name,
            description: char.description,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        if (record) {
          // Send full Character record via WS (matching old project's CharacterRead schema)
          this.wsGateway.sendToProject(projectId, "character_created", {
            character: {
              id: record.id,
              project_id: projectId,
              name: record.name,
              description: record.description,
              image_url: record.imageUrl,
              reference_images: record.referenceImages,
              visual_notes: record.visualNotes,
              approval_state: "draft",
              approval_version: record.approvalVersion || 0,
            },
          });
        }
        return record || { id: 0 };
      },

      generateCharacterImage: async () => {
        console.log(`[processor] Generating character images for project ${projectId}`);
        await ctx.sendMessage("正在生成角色人物照片...", {
          summary: "角色照片生成中",
          progress: 0.38,
          stage: "plan_characters",
        });

        const characters = await this.db
          .select()
          .from(schema.characters)
          .where(eq(schema.characters.projectId, projectId))
          .orderBy(asc(schema.characters.id));

        const failures: string[] = [];
        for (const character of characters) {
          if (character.imageUrl) continue;
          const prompt = [
            `Create a polished character portrait for an AI comic/drama project.`,
            `Project style: ${project?.style || "anime"}.`,
            `Character name: ${character.name}.`,
            `Character description: ${character.description || ""}`,
            `Visual bible: ${latestVisualBible || "clean, consistent character design, expressive face, full body reference"}.`,
          ].join("\n");

          try {
            const imageUrl = await this.imageService.generateImage(prompt);
            const [updated] = await this.db
              .update(schema.characters)
              .set({
                imageUrl,
                referenceImages: [imageUrl],
                updatedAt: new Date(),
              })
              .where(eq(schema.characters.id, character.id))
              .returning();

            if (updated) {
              this.wsGateway.sendToProject(projectId, "character_updated", {
                character: toCharacterPayload(updated),
              });
            }
          } catch (err) {
            console.warn(`[processor] Character image generation failed for "${character.name}":`, err);
            failures.push(character.name);
            await ctx.sendMessage(`角色「${character.name}」照片生成暂时失败，可稍后重新生成。`, {
              summary: "角色照片生成失败",
              progress: 0.38,
              stage: "plan_characters",
            });
          }
        }
        if (failures.length > 0) {
          throw new Error(`角色照片生成失败：${failures.join("、")}。请稍后重试，已成功的角色照片会保留。`);
        }
      },

      createShot: async (shot: {
        order: number;
        description: string;
	        camera?: string;
	        dialogue?: string;
	        action?: string;
	        scene?: string;
	        lighting?: string;
	        prompt?: string;
	        imagePrompt?: string;
	        duration?: number;
	        motionNote?: string;
	      }) => {
	        console.log(`[processor:db] Creating shot: order=${shot.order}`);
	        const imagePrompt = shot.imagePrompt || buildShotImagePrompt(shot, latestVisualBible, project?.style);
	        const videoPrompt = shot.prompt || buildShotVideoPrompt(shot, imagePrompt);
	        const [existing] = await this.db
	          .select()
	          .from(schema.shots)
	          .where(and(eq(schema.shots.projectId, projectId), eq(schema.shots.order, shot.order)))
	          .limit(1);

	        if (existing) {
	          const [updated] = await this.db
	            .update(schema.shots)
	            .set({
	              description: shot.description,
	              prompt: videoPrompt,
	              imagePrompt,
	              camera: shot.camera || null,
	              dialogue: shot.dialogue || null,
	              action: shot.action || null,
	              scene: shot.scene || null,
	              lighting: shot.lighting || null,
	              motionNote: shot.motionNote || null,
	              duration: shot.duration || existing.duration || 5,
	              updatedAt: new Date(),
	            })
	            .where(eq(schema.shots.id, existing.id))
	            .returning();

	          if (updated) {
	            this.wsGateway.sendToProject(projectId, "shot_updated", { shot: toShotPayload(updated) });
	          }

	          return updated || existing;
	        }

	        const [record] = await this.db
	          .insert(schema.shots)
	          .values({
	            projectId,
	            order: shot.order,
	            description: shot.description,
	            prompt: videoPrompt,
	            imagePrompt,
	            camera: shot.camera || null,
	            dialogue: shot.dialogue || null,
	            action: shot.action || null,
	            scene: shot.scene || null,
	            lighting: shot.lighting || null,
	            motionNote: shot.motionNote || null,
	            duration: shot.duration || 5,
	            createdAt: new Date(),
	            updatedAt: new Date(),
	          })
          .returning();
        if (record) {
          // Send full Shot record via WS
          this.wsGateway.sendToProject(projectId, "shot_created", {
            shot: {
              id: record.id,
              project_id: projectId,
              order: record.order,
              description: record.description,
              camera: record.camera,
              scene: record.scene,
              action: record.action,
              dialogue: record.dialogue,
              image_url: record.imageUrl,
              video_url: record.videoUrl,
              duration: record.duration,
              prompt: record.prompt,
              image_prompt: record.imagePrompt,
              approval_state: "draft",
              approval_version: record.approvalVersion || 0,
            },
          });
        }
	        return record || { id: 0 };
	      },

	      generateShotFrames: async () => {
	        console.log(`[processor] Generating shot frames for project ${projectId}`);
	        const shots = await this.db
	          .select()
	          .from(schema.shots)
	          .where(eq(schema.shots.projectId, projectId))
	          .orderBy(asc(schema.shots.order));

	        const failures: number[] = [];
	        for (const shot of shots) {
	          if (shot.imageUrl) continue;
	          const imagePrompt = shot.imagePrompt || buildShotImagePrompt(shot, latestVisualBible, project?.style);
	          try {
	            const imageUrl = await this.imageService.generateImage(imagePrompt);
	            const [updated] = await this.db
	              .update(schema.shots)
	              .set({
	                imagePrompt,
	                imageUrl,
	                updatedAt: new Date(),
	              })
	              .where(eq(schema.shots.id, shot.id))
	              .returning();

	            if (updated) {
	              this.wsGateway.sendToProject(projectId, "shot_updated", { shot: toShotPayload(updated) });
	            }
	          } catch (err) {
	            console.warn(`[processor] Shot frame generation failed for #${shot.order}:`, err);
	            failures.push(shot.order);
	          }
	        }
	        if (failures.length > 0) {
	          throw new Error(`分镜帧生成失败：镜头 ${failures.join("、")}。请稍后重试，已成功的分镜帧会保留。`);
	        }
	      },

	      generateShotVideos: async () => {
	        console.log(`[processor] Generating shot videos for project ${projectId}`);
	        const shots = await this.db
	          .select()
	          .from(schema.shots)
	          .where(eq(schema.shots.projectId, projectId))
	          .orderBy(asc(schema.shots.order));

	        const failures: number[] = [];
	        for (const shot of shots) {
	          if (shot.videoUrl && isPlayableVideoUrl(shot.videoUrl)) continue;
	          const prompt = shot.prompt || buildShotVideoPrompt(shot, shot.imagePrompt || shot.description);
	          try {
	            const videoUrl = await this.videoService.generateVideo(prompt, {
	              imageUrl: shot.imageUrl,
	              duration: shot.duration,
	            });
	            const [updated] = await this.db
	              .update(schema.shots)
	              .set({
	                prompt,
	                videoUrl,
	                updatedAt: new Date(),
	              })
	              .where(eq(schema.shots.id, shot.id))
	              .returning();

	            if (updated) {
	              this.wsGateway.sendToProject(projectId, "shot_updated", { shot: toShotPayload(updated) });
	            }
	          } catch (err) {
	            console.warn(`[processor] Shot video generation failed for #${shot.order}:`, err);
	            failures.push(shot.order);
	            await this.db
	              .update(schema.shots)
	              .set({ videoUrl: null, updatedAt: new Date() })
	              .where(eq(schema.shots.id, shot.id));
	          }
	        }
	        if (failures.length > 0) {
	          throw new Error(`镜头视频生成失败：镜头 ${failures.join("、")}。请检查视频额度或稍后重试，已成功的视频会保留。`);
	        }
	      },

	      composeProjectVideo: async () => {
	        console.log(`[processor] Composing final output for project ${projectId}`);
	        const shots = await this.db
	          .select()
	          .from(schema.shots)
	          .where(eq(schema.shots.projectId, projectId))
	          .orderBy(asc(schema.shots.order));
	        const missing = shots.filter((shot) => !shot.videoUrl || !isPlayableVideoUrl(shot.videoUrl));
	        if (missing.length > 0) {
	          throw new Error(`还有 ${missing.length} 个镜头视频未完成，无法合成最终输出。`);
	        }
	        const clipUrls = shots.map((shot) => shot.videoUrl).filter((url): url is string => Boolean(url));
	        const videoUrl = clipUrls.length > 0 ? await this.videoService.composeVideo(projectId, clipUrls) : null;

	        await this.db
	          .update(schema.projects)
	          .set({
	            videoUrl,
	            status: videoUrl ? "completed" : "draft",
	            updatedAt: new Date(),
	          })
	          .where(eq(schema.projects.id, projectId));

	        this.wsGateway.sendToProject(projectId, "project_updated", {
	          video_url: videoUrl,
	          status: videoUrl ? "completed" : "draft",
	        });
	      },

	    };

    // Inject context so graph nodes can use it
    setNodeContext(ctx);

    // Initial state
    const initialStage = (job.data.targetStage as Phase2StateType["currentStage"] | undefined) || "plan_outline";
    const initialApprovalHistory: Record<string, string> = {};
    if (
      initialStage === "plan_characters" ||
      initialStage === "plan_shots" ||
      initialStage === "render_shot_images" ||
      initialStage === "compose_videos"
    ) {
      initialApprovalHistory.outline = "approved";
    }
    if (initialStage === "plan_shots" || initialStage === "render_shot_images" || initialStage === "compose_videos") {
      initialApprovalHistory.characters = "approved";
    }
    if (initialStage === "render_shot_images" || initialStage === "compose_videos") {
      initialApprovalHistory.shots = "approved";
    }

    const initialState: Phase2StateType = {
      projectId: String(projectId),
      runId: String(runId),
      threadId,
      currentStage: initialStage,
      nextStage: null,
      stageHistory: [],
      approvalHistory: initialApprovalHistory,
      critiqueScores: {},
      critiqueRound: 0,
      artifactLineage: {},
      routeStage: null,
      routeMode: "full",
      reviewRequested: false,
    };

    try {
      await runWithNodeContext(ctx, async () => {
      console.log(`[processor] Invoking graph with initial state...`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let graphInput: any = initialState;
      let isComplete = false;
      let stepCount = 0;

      while (!isComplete && stepCount < 50) {
        stepCount++;
        console.log(`[processor] Step ${stepCount}: invoking graph...`);

        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = await compiled.invoke(graphInput as any, config);

          // Check for interrupts using LangGraph.js v1.x API
          if (isInterrupted(result)) {
            const interruptData = result[INTERRUPT] as Array<{ value: unknown }>;
            const interruptValue = interruptData?.[0]?.value as Record<string, unknown> | undefined;
            const gate = (interruptValue?.gate as string) || "unknown";
            const question = (interruptValue?.question as string) || "Continue?";

            console.log(`[processor] ⏸ Interrupted at gate="${gate}" question="${question}"`);

            // Get the current stage from state for the WS event
            const currentStageValue = (result as Record<string, unknown>).currentStage || "plan_outline";

            this.wsGateway.sendToProject(projectId, "run_awaiting_confirm", {
              run_id: runId,
              project_id: projectId,
              agent: gate === "outline_approval" ? "outline" : "system",
              gate,
              current_stage: currentStageValue,
              question,
              auto_mode: job.data.autoMode || false,
              ...(gate === "outline_approval" && latestOutline
                ? {
                    story_outline: latestOutline,
                    visual_bible: latestVisualBible,
                  }
                : {}),
            });

            // In auto mode, auto-resume after a short delay
            const autoMode = job.data.autoMode || false;
            let confirmed: boolean;

            if (autoMode) {
              console.log(`[processor] Auto mode — auto-confirming after 1s delay`);
              await new Promise((r) => setTimeout(r, 1000));
              confirmed = true;
            } else {
              console.log(`[processor] Manual mode — waiting for confirm (30 min timeout)...`);
              confirmed = await this.waitForConfirm(projectId, runId, 30 * 60 * 1000);
            }

            if (confirmed) {
              console.log(`[processor] ✓ Resuming graph...`);
              if (gate === "outline_approval") {
                await this.db
                  .update(schema.projects)
                  .set({ outlineApproved: true, updatedAt: new Date() })
                  .where(eq(schema.projects.id, projectId));
                this.wsGateway.sendToProject(projectId, "outline_updated", {
                  project_id: projectId,
                  story_outline: latestOutline,
                  visual_bible: latestVisualBible,
                  outline_approved: true,
                });
              }
              this.wsGateway.sendToProject(projectId, "run_confirmed", {
                run_id: runId,
                project_id: projectId,
              });
              graphInput = new Command({ resume: true });
            } else {
              console.log(`[processor] ✗ Cancelled by user or timeout`);
              await this.db
                .update(schema.agentRuns)
                .set({ status: "cancelled", updatedAt: new Date() })
                .where(eq(schema.agentRuns.id, runId));
              this.wsGateway.sendToProject(projectId, "run_cancelled", {
                run_id: runId,
                project_id: projectId,
              });
              isComplete = true;
            }
          } else {
            // No interrupt — graph completed successfully
            isComplete = true;
            console.log(`[processor] ✓ Graph completed successfully after ${stepCount} steps`);

            await this.db
              .update(schema.agentRuns)
              .set({ status: "succeeded", progress: 1.0, updatedAt: new Date() })
              .where(eq(schema.agentRuns.id, runId));

            this.wsGateway.sendToProject(projectId, "run_completed", {
              run_id: runId,
              project_id: projectId,
              message: "Generation completed",
            });
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`[processor] ✗ Error in step ${stepCount}: ${errorMessage}`);
          if (error instanceof Error && error.stack) {
            console.error(`[processor] Stack:`, error.stack.substring(0, 500));
          }

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
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[processor] Generation FAILED for run ${runId}:`, errorMessage);
      throw error;
    } finally {
      clearNodeContext();
      console.log(`[processor] === Generation job finished (run=${runId}) ===`);
    }
  }

  private waitForConfirm(projectId: number, runId: number, timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      const channel = `generation:${projectId}:${runId}`;
      console.log(`[processor:confirm] Subscribing to Redis channel "${channel}"`);

      const onMessage = (msgChannel: string, message: string) => {
        if (msgChannel === channel) {
          try {
            const data = JSON.parse(message);
            console.log(`[processor:confirm] Received message on "${channel}":`, data);
            if (data.action === "confirm") {
              clearTimeout(timer);
              this.redisSub.off("message", onMessage);
              this.redisSub.unsubscribe(channel);
              resolve(true);
            } else if (data.action === "cancel") {
              clearTimeout(timer);
              this.redisSub.off("message", onMessage);
              this.redisSub.unsubscribe(channel);
              resolve(false);
            }
          } catch {
            // ignore parse errors
          }
        }
      };

      const timer = setTimeout(() => {
        console.log(`[processor:confirm] Timeout after ${timeoutMs}ms`);
        this.redisSub.off("message", onMessage);
        this.redisSub.unsubscribe(channel);
        resolve(false);
      }, timeoutMs);

      this.redisSub.subscribe(channel, (err) => {
        if (err) {
          console.error(`[processor:confirm] Subscribe error:`, err);
          clearTimeout(timer);
          resolve(false);
          return;
        }
        console.log(`[processor:confirm] Subscribed to "${channel}"`);
      });

      this.redisSub.on("message", onMessage);
    });
  }
}

type CharacterRecord = typeof schema.characters.$inferSelect;
type ShotRecord = typeof schema.shots.$inferSelect;

function toCharacterPayload(record: CharacterRecord) {
  return {
    id: record.id,
    project_id: record.projectId,
    name: record.name,
    description: record.description,
    image_url: record.imageUrl,
    reference_images: record.referenceImages,
    visual_notes: record.visualNotes,
    approval_state: "draft",
    approval_version: record.approvalVersion || 0,
  };
}

function toShotPayload(record: ShotRecord) {
  return {
    id: record.id,
    project_id: record.projectId,
    order: record.order,
    description: record.description,
    camera: record.camera,
    scene: record.scene,
    action: record.action,
    dialogue: record.dialogue,
    image_url: record.imageUrl,
    video_url: record.videoUrl,
    duration: record.duration,
    prompt: record.prompt,
    image_prompt: record.imagePrompt,
    approval_state: "draft",
    approval_version: record.approvalVersion || 0,
  };
}

function buildShotImagePrompt(
  shot: {
    order?: number;
    description?: string | null;
    camera?: string | null;
    scene?: string | null;
    action?: string | null;
    lighting?: string | null;
  },
  visualBible?: string | null,
  style?: string | null,
): string {
  return [
    `Create a storyboard key frame for shot ${shot.order || ""}.`,
    `Style: ${style || "anime comic drama"}.`,
    visualBible ? `Visual bible: ${visualBible}.` : null,
    shot.scene ? `Scene: ${shot.scene}.` : null,
    shot.description ? `Description: ${shot.description}.` : null,
    shot.action ? `Action: ${shot.action}.` : null,
    shot.camera ? `Camera: ${shot.camera}.` : null,
    shot.lighting ? `Lighting: ${shot.lighting}.` : null,
    "Single cinematic frame, consistent character designs, production-ready composition.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildShotVideoPrompt(
  shot: {
    order?: number;
    description?: string | null;
    camera?: string | null;
    action?: string | null;
    dialogue?: string | null;
    motionNote?: string | null;
  },
  imagePrompt?: string | null,
): string {
  return [
    `Generate a short comic-drama video clip for shot ${shot.order || ""}.`,
    imagePrompt ? `Key frame prompt: ${imagePrompt}.` : null,
    shot.description ? `Story action: ${shot.description}.` : null,
    shot.action ? `Movement: ${shot.action}.` : null,
    shot.motionNote ? `Motion note: ${shot.motionNote}.` : null,
    shot.camera ? `Camera: ${shot.camera}.` : null,
    shot.dialogue ? `Dialogue context: ${shot.dialogue}.` : null,
    "Keep motion gentle, coherent, and suitable for later montage composition.",
  ]
    .filter(Boolean)
    .join("\n");
}

function isPlayableVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|#|$)/i.test(url) || url.includes(".oss-") && url.includes(".mp4");
}
