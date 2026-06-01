export { Phase2State } from "./state.js";
export type { Phase2StateType } from "./state.js";
export { buildPhase2Graph, phase2Graph } from "./graph.js";
export { createCheckpointer } from "./checkpointer.js";

// Agents
export { BaseAgent } from "./agents/base.js";
export type { AgentContext } from "./agents/base.js";
export { OutlineAgent } from "./agents/outline.js";
export { PlanAgent } from "./agents/plan.js";
export { ComposeAgent } from "./agents/compose.js";
export { ReviewRuleEngine } from "./agents/review.js";

// Nodes (for testing)
export * as nodes from "./nodes/index.js";

// Context injection (called by Nest.js processor before graph execution)
export { setNodeContext, clearNodeContext, runWithNodeContext } from "./nodes/index.js";

// Prompts
export * from "./prompts/index.js";
