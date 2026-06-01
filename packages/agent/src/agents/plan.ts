import { BaseAgent, type AgentContext } from "./base.js";
import type { Phase2StateType } from "../state.js";
import { CHARACTER_SYSTEM_PROMPT, SHOT_SYSTEM_PROMPT } from "../prompts/plan.js";

export class PlanAgent extends BaseAgent {
  constructor() {
    super("plan");
  }

  async runCharacters(ctx: AgentContext, _state: Phase2StateType): Promise<Partial<Phase2StateType>> {
    await ctx.sendMessage("开始生成角色设计...", { progress: 0.25, isLoading: true, stage: "plan_characters" });
    await ctx.sendThinking("planning", "基于故事大纲设计角色...");

    const response = await ctx.callLlm(
      CHARACTER_SYSTEM_PROMPT,
      "Design 2-4 main characters for this story. Output ONLY valid JSON.",
      { maxTokens: 4096 },
    );

    let characters: Array<{ name: string; description: string }> = [];
    try {
      const parsed = JSON.parse(extractJson(response));
      const rawCharacters = Array.isArray(parsed) ? parsed : parsed.characters || [];
      characters = rawCharacters.map(normalizeCharacter).filter(Boolean);
    } catch {
      console.warn("[PlanAgent] Failed to parse character JSON, using fallback");
      characters = [
        { name: "主角", description: "故事的主人公。" },
        { name: "配角", description: "辅助角色。" },
      ];
    }

    const created: string[] = [];
    for (const char of characters) {
      try {
        const record = await ctx.createCharacter(char);
        created.push(`${char.name}`);
      } catch (err) {
        console.warn(`[PlanAgent] Failed to create character "${char.name}":`, err);
      }
    }

    await ctx.sendMessage(`角色设计完成：${created.join(", ")}`, {
      progress: 0.4,
      summary: `已创建 ${created.length} 个角色`,
      stage: "plan_characters",
    });

    return {
      currentStage: "plan_characters",
      nextStage: "characters_approval",
      stageHistory: ["plan_characters"],
      reviewRequested: false,
    };
  }

  async runShots(ctx: AgentContext, _state: Phase2StateType): Promise<Partial<Phase2StateType>> {
    await ctx.sendMessage("开始生成分镜脚本...", { progress: 0.45, isLoading: true, stage: "plan_shots" });
    await ctx.sendThinking("planning", "分析叙事节奏，设计镜头语言...");

    const response = await ctx.callLlm(
      SHOT_SYSTEM_PROMPT,
      "Create 4-8 shot scripts based on the characters and outline. Output ONLY valid JSON.",
      { maxTokens: 4096 },
    );

    let shots: Array<{
      order: number;
      description: string;
      camera?: string;
      scene?: string;
      action?: string;
      dialogue?: string;
      lighting?: string;
    }> = [];
    try {
      const parsed = JSON.parse(extractJson(response));
      const rawShots = Array.isArray(parsed) ? parsed : parsed.shots || [];
      shots = rawShots.map(normalizeShot).filter(Boolean);
    } catch {
      console.warn("[PlanAgent] Failed to parse shot JSON, using fallback");
      shots = [
        { order: 1, description: "开场镜头，建立场景氛围。", camera: "Wide shot" },
        { order: 2, description: "角色出场，展示关键动作。", camera: "Medium shot" },
        { order: 3, description: "冲突升级，紧张感增强。", camera: "Close-up" },
        { order: 4, description: "转折点，新的信息被揭示。", camera: "Over-the-shoulder" },
      ];
    }

    const created: string[] = [];
    for (const shot of shots) {
      try {
        const record = await ctx.createShot({
          order: shot.order || created.length + 1,
          description: shot.description || "未命名镜头",
          camera: shot.camera,
          scene: shot.scene,
          action: shot.action,
          dialogue: shot.dialogue,
        });
        created.push(`#${record.id}`);
      } catch (err) {
        console.warn(`[PlanAgent] Failed to create shot:`, err);
      }
    }

    await ctx.sendMessage(`分镜脚本生成完成：${created.length} 个镜头`, {
      progress: 0.6,
      summary: `已创建 ${created.length} 个分镜`,
      stage: "plan_shots",
    });

    return {
      currentStage: "plan_shots",
      nextStage: "shots_approval",
      stageHistory: ["plan_shots"],
      reviewRequested: false,
    };
  }
}

/** Extract JSON from LLM response — handles markdown code fences */
function extractJson(text: string): string {
  // Try to find JSON in markdown code blocks first
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // If no fences, find the first { or [ and try to extract
  const braceMatch = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (braceMatch) return braceMatch[1].trim();

  return text.trim();
}

function normalizeCharacter(value: unknown): { name: string; description: string } | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const name = String(record.name || record.character_name || record.title || "").trim();
  if (!name) return null;

  const descriptionParts = [
    record.description,
    record.role,
    record.appearance,
    record.personality,
    record.backstory,
    record.visual_traits,
  ]
    .filter((part) => typeof part === "string" && part.trim().length > 0)
    .map(String);

  return {
    name,
    description: descriptionParts.join("\n") || "暂无角色描述。",
  };
}

function normalizeShot(value: unknown): {
  order: number;
  description: string;
  camera?: string;
  scene?: string;
  action?: string;
  dialogue?: string;
  lighting?: string;
} | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const description = String(record.description || record.shot_description || record.summary || "").trim();
  if (!description) return null;

  return {
    order: Number(record.order || record.shot || record.shot_number || 0),
    description,
    camera: stringOrUndefined(record.camera || record.camera_angle || record.shot_type),
    scene: stringOrUndefined(record.scene || record.setting),
    action: stringOrUndefined(record.action || record.motion),
    dialogue: stringOrUndefined(record.dialogue || record.line),
    lighting: stringOrUndefined(record.lighting),
  };
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}
