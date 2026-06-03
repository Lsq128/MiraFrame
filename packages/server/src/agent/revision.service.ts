import { Inject, Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { DRIZZLE, type Db } from "../db";
import { schema } from "../db";

export interface RevisionInput {
  projectId: number;
  content: string;
  feedbackType?: string;
  entityType?: string;
  entityId?: number;
}

@Injectable()
export class RevisionService {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  targetStageFor(input: RevisionInput): string {
    if (input.entityType === "outline") return "plan_outline";
    if (input.entityType === "character" || input.entityType === "characters") return "plan_characters";
    if (input.entityType === "shots") return "plan_shots";
    if (input.entityType === "shot") {
      if (input.feedbackType === "script" || input.feedbackType === "dialogue") return "plan_shots";
      return "render_shot_images";
    }
    if (input.entityType === "project_video") return "compose_videos";
    return "review";
  }

  async prepareAssets(input: RevisionInput): Promise<void> {
    if ((input.entityType === "character" || input.entityType === "characters") && input.feedbackType === "regenerate_image") {
      if (input.entityId) {
        await this.db
          .update(schema.characters)
          .set({ imageUrl: null, referenceImages: [], updatedAt: new Date() })
          .where(eq(schema.characters.id, input.entityId));
      } else {
        await this.db
          .update(schema.characters)
          .set({ imageUrl: null, referenceImages: [], updatedAt: new Date() })
          .where(eq(schema.characters.projectId, input.projectId));
      }
      return;
    }

    if (input.entityType !== "shot") return;

    if (!input.entityId) {
      const projectShots = await this.db
        .select({ id: schema.shots.id, prompt: schema.shots.prompt, imagePrompt: schema.shots.imagePrompt })
        .from(schema.shots)
        .where(eq(schema.shots.projectId, input.projectId));

      for (const shot of projectShots) {
        await this.prepareShotAsset(input, shot.id, shot.prompt, shot.imagePrompt);
      }
      return;
    }

    const [shot] = await this.db
      .select({ prompt: schema.shots.prompt, imagePrompt: schema.shots.imagePrompt })
      .from(schema.shots)
      .where(eq(schema.shots.id, input.entityId))
      .limit(1);

    await this.prepareShotAsset(input, input.entityId, shot?.prompt, shot?.imagePrompt);
  }

  formatUserMessage(input: RevisionInput): string {
    const target = [input.entityType, input.entityId ? `#${input.entityId}` : null, input.feedbackType]
      .filter(Boolean)
      .join(" / ");
    return target ? `[修改反馈：${target}]\n${input.content}` : input.content;
  }

  formatAcceptedMessage(input: RevisionInput, targetStage: string): string {
    const target = input.entityType === "shot" && input.entityId
      ? `镜头 #${input.entityId}`
      : this.entityLabel(input.entityType);
    return `已提交修改：${target}\n将重新执行节点：${targetStage}\n反馈内容：${input.content}`;
  }

  private async prepareShotAsset(
    input: RevisionInput,
    shotId: number,
    prompt?: string | null,
    imagePrompt?: string | null,
  ): Promise<void> {
    if (input.feedbackType === "regenerate_video" || input.feedbackType === "motion") {
      const nextPrompt = [prompt, `用户视频反馈：${input.content}`].filter(Boolean).join("\n");
      await this.db
        .update(schema.shots)
        .set({ prompt: nextPrompt, videoUrl: null, updatedAt: new Date() })
        .where(eq(schema.shots.id, shotId));
    }

    if (input.feedbackType === "regenerate_image" || input.feedbackType === "style") {
      const nextImagePrompt = [imagePrompt, `用户画面反馈：${input.content}`].filter(Boolean).join("\n");
      await this.db
        .update(schema.shots)
        .set({ imagePrompt: nextImagePrompt, imageUrl: null, videoUrl: null, updatedAt: new Date() })
        .where(eq(schema.shots.id, shotId));
    }
  }

  private entityLabel(entityType?: string): string {
    const map: Record<string, string> = {
      outline: "故事大纲",
      character: "角色设定",
      characters: "角色设定",
      shots: "分镜脚本",
      shot: "镜头物料",
      project_video: "合成输出",
    };
    return entityType ? map[entityType] || entityType : "项目";
  }
}
