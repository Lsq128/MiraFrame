import { BaseAgent, type AgentContext } from "./base.js";
import type { Phase2StateType } from "../state.js";
import { CRITIC_SYSTEM_PROMPT } from "../prompts/critic.js";

const SCORE_THRESHOLD = 7.0;
const MAX_ROUNDS = 2;

export class CriticAgent extends BaseAgent {
  constructor() {
    super("critic");
  }

  async reviewCharacters(ctx: AgentContext, state: Phase2StateType): Promise<Partial<Phase2StateType>> {
    const round = (state.critiqueRound || 0) + 1;
    const previousScores = state.critiqueScores || {};

    await this.sendMessage(ctx, `正在进行角色图像质量审查 (第${round}轮)...`, { progress: 0.72 });
    await this.sendThinking(ctx, "reviewing", "评估角色图像质量：一致性、细节、风格匹配...");

    // Placeholder: score from LLM critique
    const score = 8.5; // Mock score above threshold
    const updatedScores = { ...previousScores, [`characters_round_${round}`]: score };

    const passed = score >= SCORE_THRESHOLD || round >= MAX_ROUNDS;

    return {
      currentStage: "critique_character_images",
      critiqueScores: updatedScores,
      critiqueRound: round,
      nextStage: passed ? "character_images_approval" : "render_characters",
      stageHistory: ["critique_character_images"],
    };
  }

  async reviewShots(ctx: AgentContext, state: Phase2StateType): Promise<Partial<Phase2StateType>> {
    const round = (state.critiqueRound || 0) + 1;
    const previousScores = state.critiqueScores || {};

    await this.sendMessage(ctx, `正在进行镜头图像质量审查 (第${round}轮)...`, { progress: 0.87 });

    const score = 8.0;
    const updatedScores = { ...previousScores, [`shots_round_${round}`]: score };

    const passed = score >= SCORE_THRESHOLD || round >= MAX_ROUNDS;

    return {
      currentStage: "critique_shot_images",
      critiqueScores: updatedScores,
      critiqueRound: round,
      nextStage: passed ? "shot_images_approval" : "render_shots",
      stageHistory: ["critique_shot_images"],
    };
  }
}
