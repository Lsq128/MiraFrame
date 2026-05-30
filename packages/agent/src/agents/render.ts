import { BaseAgent, type AgentContext } from "./base.js";
import type { Phase2StateType } from "../state.js";

export class RenderAgent extends BaseAgent {
  constructor() {
    super("render");
  }

  async runCharacters(ctx: AgentContext, _state: Phase2StateType): Promise<Partial<Phase2StateType>> {
    await this.sendMessage(ctx, "开始生成角色图像...", { progress: 0.65, isLoading: true });
    await this.sendThinking(ctx, "decision", "根据角色描述生成参考图 prompt...");

    // Placeholder: actual image generation happens in server's ImageService
    await this.sendMessage(ctx, "角色图像生成完成", { progress: 0.75, summary: "角色图像已生成" });

    return {
      currentStage: "render_characters",
      nextStage: "critique_character_images",
      stageHistory: ["render_characters"],
      reviewRequested: false,
    };
  }

  async runShots(ctx: AgentContext, _state: Phase2StateType): Promise<Partial<Phase2StateType>> {
    await this.sendMessage(ctx, "开始生成镜头图像...", { progress: 0.8, isLoading: true });

    await this.sendMessage(ctx, "镜头图像生成完成", { progress: 0.9, summary: "镜头图像已生成" });

    return {
      currentStage: "render_shots",
      nextStage: "critique_shot_images",
      stageHistory: ["render_shots"],
      reviewRequested: false,
    };
  }
}
