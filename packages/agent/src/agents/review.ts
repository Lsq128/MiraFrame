import { BaseAgent, type AgentContext } from "./base.js";
import type { Phase2StateType } from "../state.js";

export class ReviewRuleEngine extends BaseAgent {
  constructor() {
    super("review");
  }

  async run(ctx: AgentContext, state: Phase2StateType): Promise<Partial<Phase2StateType>> {
    await this.sendMessage(ctx, "正在处理反馈...", { isLoading: true });

    // Determine which stage to route back to based on current state
    const routeMap: Record<string, string> = {
      outline_approval: "plan_outline",
      characters_approval: "plan_characters",
      shots_approval: "plan_shots",
      character_images_approval: "render_characters",
      shot_images_approval: "render_shots",
      compose_approval: "compose_videos",
    };

    const targetStage = routeMap[state.currentStage] || "plan_outline";

    return {
      currentStage: "review",
      routeStage: targetStage,
      routeMode: "incremental",
      reviewRequested: false,
    };
  }
}
