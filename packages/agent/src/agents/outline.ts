import { BaseAgent, type AgentContext } from "./base.js";
import type { Phase2StateType } from "../state.js";
import { OUTLINE_SYSTEM_PROMPT } from "../prompts/outline.js";

export class OutlineAgent extends BaseAgent {
  constructor() {
    super("outline");
  }

  async run(ctx: AgentContext, _state: Phase2StateType): Promise<Partial<Phase2StateType>> {
    await this.sendMessage(ctx, "开始生成故事大纲...", { progress: 0.05, isLoading: true });
    await this.sendThinking(ctx, "planning", "分析故事要素：主题、世界观、情感弧线...");

    const outline = await this.callLlm(ctx, OUTLINE_SYSTEM_PROMPT, "Generate a story outline for this project.", { maxTokens: 4096 });

    // Parse outline from LLM response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let storyOutline: Record<string, unknown> = {};
    try {
      storyOutline = JSON.parse(outline);
    } catch {
      storyOutline = { raw: outline };
    }

    await this.sendMessage(ctx, "故事大纲已生成", { progress: 0.2, summary: "大纲生成完成" });

    return {
      currentStage: "plan_outline",
      nextStage: "outline_approval",
      stageHistory: ["plan_outline"],
      reviewRequested: false,
    };
  }
}
