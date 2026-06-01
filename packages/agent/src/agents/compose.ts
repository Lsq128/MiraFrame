import { BaseAgent, type AgentContext } from "./base.js";
import type { Phase2StateType } from "../state.js";

export class ComposeAgent extends BaseAgent {
  constructor() {
    super("compose");
  }

  async runVideos(ctx: AgentContext, _state: Phase2StateType): Promise<Partial<Phase2StateType>> {
    await this.sendMessage(ctx, "开始生成视频片段...", { progress: 0.85, isLoading: true, stage: "compose_videos" });
    await ctx.composeProjectVideo();
    return { currentStage: "compose_videos", nextStage: "compose_approval", stageHistory: ["compose_videos"] };
  }
}
