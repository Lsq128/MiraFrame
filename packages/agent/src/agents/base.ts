import type { Phase2StateType } from "../state.js";

export interface AgentContext {
  projectId: number;
  runId: number;
  threadId: string;
  sendMessage: (content: string, opts?: { summary?: string; progress?: number; isLoading?: boolean; stage?: string }) => Promise<void>;
  sendThinking: (phase: "reasoning" | "decision" | "planning" | "reviewing", content: string, details?: string) => Promise<void>;
  callLlm: (systemPrompt: string, userPrompt: string, opts?: { maxTokens?: number }) => Promise<string>;
  /** Persist the generated story outline and notify frontend via WS */
  saveOutline: (outline: Record<string, unknown>, visualBible?: string | null) => Promise<void>;
  /** Create a character record in the DB and notify frontend via WS */
  createCharacter: (character: { name: string; description: string }) => Promise<{ id: number }>;
  /** Create a shot record in the DB and notify frontend via WS */
  createShot: (shot: {
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
  }) => Promise<{ id: number }>;
  /** Generate character images based on existing character descriptions */
  generateCharacterImage: () => Promise<void>;
  /** Generate per-shot frame images from storyboard prompts */
  generateShotFrames: () => Promise<void>;
  /** Generate per-shot video clips from storyboard frames */
  generateShotVideos: () => Promise<void>;
  /** Compose shot clips into the final project output */
  composeProjectVideo: () => Promise<void>;
}

export class BaseAgent {
  readonly name: string;

  constructor(name: string) {
    this.name = name;
  }

  async sendMessage(
    ctx: AgentContext,
    content: string,
    opts?: { summary?: string; progress?: number; isLoading?: boolean; stage?: string },
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
