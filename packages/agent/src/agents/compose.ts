import { BaseAgent, type AgentContext } from "./base.js";
import type { Phase2StateType } from "../state.js";

export class ComposeAgent extends BaseAgent {
  constructor() {
    super("compose");
  }

  async runVideos(ctx: AgentContext, _state: Phase2StateType): Promise<Partial<Phase2StateType>> {
    await this.sendMessage(ctx, "开始生成视频片段...", { progress: 0.85, isLoading: true });
    return { currentStage: "compose_videos", nextStage: "compose_approval", stageHistory: ["compose_videos"] };
  }

  async runMerge(ctx: AgentContext, _state: Phase2StateType): Promise<Partial<Phase2StateType>> {
    await this.sendMessage(ctx, "正在拼接视频...", { progress: 0.92, isLoading: true });
    return { currentStage: "compose_merge", nextStage: "add_audio", stageHistory: ["compose_merge"] };
  }

  async runAddAudio(ctx: AgentContext, _state: Phase2StateType): Promise<Partial<Phase2StateType>> {
    await this.sendMessage(ctx, "正在添加音频...", { progress: 0.97, isLoading: true });
    return { currentStage: "add_audio", nextStage: "compose_approval", stageHistory: ["add_audio"] };
  }
}
