import { BaseAgent, type AgentContext } from "./base.js";
import type { Phase2StateType } from "../state.js";
import { CHARACTER_SYSTEM_PROMPT, SHOT_SYSTEM_PROMPT } from "../prompts/plan.js";

export class PlanAgent extends BaseAgent {
  constructor() {
    super("plan");
  }

  async runCharacters(ctx: AgentContext, _state: Phase2StateType): Promise<Partial<Phase2StateType>> {
    await this.sendMessage(ctx, "开始生成角色设计...", { progress: 0.25, isLoading: true });
    await this.sendThinking(ctx, "planning", "基于故事大纲设计角色...");

    await this.callLlm(ctx, CHARACTER_SYSTEM_PROMPT, "Design characters based on the story.", { maxTokens: 4096 });

    await this.sendMessage(ctx, "角色设计完成", { progress: 0.4, summary: `角色已设计` });

    return {
      currentStage: "plan_characters",
      nextStage: "characters_approval",
      stageHistory: ["plan_characters"],
      reviewRequested: false,
    };
  }

  async runShots(ctx: AgentContext, _state: Phase2StateType): Promise<Partial<Phase2StateType>> {
    await this.sendMessage(ctx, "开始生成分镜脚本...", { progress: 0.45, isLoading: true });
    await this.sendThinking(ctx, "planning", "分析叙事节奏，设计镜头语言...");

    await this.callLlm(ctx, SHOT_SYSTEM_PROMPT, "Create shot scripts based on characters and story.", { maxTokens: 4096 });

    await this.sendMessage(ctx, "分镜脚本生成完成", { progress: 0.6, summary: `分镜已设计` });

    return {
      currentStage: "plan_shots",
      nextStage: "shots_approval",
      stageHistory: ["plan_shots"],
      reviewRequested: false,
    };
  }
}
