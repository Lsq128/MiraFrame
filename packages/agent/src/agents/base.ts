import type { Phase2StateType } from "../state.js";

export interface AgentContext {
  projectId: number;
  runId: number;
  threadId: string;
  sendMessage: (content: string, opts?: { summary?: string; progress?: number; isLoading?: boolean }) => Promise<void>;
  sendThinking: (phase: "reasoning" | "decision" | "planning" | "reviewing", content: string, details?: string) => Promise<void>;
  callLlm: (systemPrompt: string, userPrompt: string, opts?: { maxTokens?: number }) => Promise<string>;
}

export class BaseAgent {
  readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  async sendMessage(
    ctx: AgentContext,
    content: string,
    opts?: { summary?: string; progress?: number; isLoading?: boolean },
  ): Promise<void> {
    await ctx.sendMessage(content, opts);
  }

  async sendThinking(
    ctx: AgentContext,
    phase: "reasoning" | "decision" | "planning" | "reviewing",
    content: string,
    details?: string,
  ): Promise<void> {
    await ctx.sendThinking(phase, content, details);
  }

  async callLlm(
    ctx: AgentContext,
    systemPrompt: string,
    userPrompt: string,
    opts?: { maxTokens?: number },
  ): Promise<string> {
    return ctx.callLlm(systemPrompt, userPrompt, opts);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async run(_ctx: AgentContext, _state: Phase2StateType): Promise<Partial<Phase2StateType>> {
    throw new Error(`Agent ${this.name}.run() not implemented`);
  }
}
