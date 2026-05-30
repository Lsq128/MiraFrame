export const APPROVAL_STATES = ["draft", "approved", "superseded"] as const;
export type ApprovalState = (typeof APPROVAL_STATES)[number];

export const RUN_STATUSES = ["queued", "running", "succeeded", "failed", "cancelled"] as const;
export type RunStatusValue = (typeof RUN_STATUSES)[number];

export const AGENT_NAMES = ["outline", "plan", "render", "compose", "critic", "review"] as const;
export type AgentName = (typeof AGENT_NAMES)[number];

export const AGENT_NAME_MAP: Record<string, string> = {
  outline: "大纲",
  plan: "规划",
  character: "角色",
  shot: "分镜",
  compose: "合成",
  review: "审查",
  critic: "质量审查",
};
