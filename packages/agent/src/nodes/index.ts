import { interrupt } from "@langchain/langgraph";
import type { Phase2StateType } from "../state.js";
import type { AgentContext } from "../agents/base.js";
import { OutlineAgent } from "../agents/outline.js";
import { PlanAgent } from "../agents/plan.js";
import { RenderAgent } from "../agents/render.js";
import { ComposeAgent } from "../agents/compose.js";
import { CriticAgent } from "../agents/critic.js";
import { ReviewRuleEngine } from "../agents/review.js";

// Factory to create agent instances
const outlineAgent = new OutlineAgent();
const planAgent = new PlanAgent();
const renderAgent = new RenderAgent();
const composeAgent = new ComposeAgent();
const criticAgent = new CriticAgent();
const reviewEngine = new ReviewRuleEngine();

// Module-scoped context — set by the Nest.js processor before graph execution.
// This allows real sendMessage / sendThinking / callLlm to be injected at runtime
// without polluting the serializable LangGraph state.
let _nodeCtx: AgentContext | null = null;

/** Call from the Nest.js AgentProcessor before invoking the graph. */
export function setNodeContext(ctx: AgentContext): void {
  _nodeCtx = ctx;
  console.log(`[agent:ctx] Context set — project=${ctx.projectId} run=${ctx.runId}`);
}

/** Call after graph execution to clean up. */
export function clearNodeContext(): void {
  _nodeCtx = null;
}

function getNodeCtx(): AgentContext {
  if (_nodeCtx) return _nodeCtx;
  // Fallback — warn loudly so we catch missing setNodeContext() calls
  console.warn("[agent:ctx] WARNING — using fallback mock context. Graph output will be empty!");
  return {
    projectId: 0,
    runId: 0,
    threadId: "",
    sendMessage: async () => { void 0; },
    sendThinking: async () => { void 0; },
    callLlm: async () => {
      console.warn("[agent:ctx] MOCK callLlm called — returning {}");
      return "{}";
    },
    saveOutline: async () => { void 0; },
    createCharacter: async () => ({ id: 0 }),
    createShot: async () => ({ id: 0 }),
  };
}

export async function planOutlineNode(state: Phase2StateType): Promise<Partial<Phase2StateType>> {
  return outlineAgent.run(getNodeCtx(), state);
}

export async function planCharactersNode(state: Phase2StateType): Promise<Partial<Phase2StateType>> {
  return planAgent.runCharacters(getNodeCtx(), state);
}

export async function planShotsNode(state: Phase2StateType): Promise<Partial<Phase2StateType>> {
  return planAgent.runShots(getNodeCtx(), state);
}

export async function renderCharactersNode(state: Phase2StateType): Promise<Partial<Phase2StateType>> {
  return renderAgent.runCharacters(getNodeCtx(), state);
}

export async function renderShotsNode(state: Phase2StateType): Promise<Partial<Phase2StateType>> {
  return renderAgent.runShots(getNodeCtx(), state);
}

export async function composeVideosNode(state: Phase2StateType): Promise<Partial<Phase2StateType>> {
  return composeAgent.runVideos(getNodeCtx(), state);
}

export async function composeMergeNode(state: Phase2StateType): Promise<Partial<Phase2StateType>> {
  return composeAgent.runMerge(getNodeCtx(), state);
}

export async function addAudioNode(state: Phase2StateType): Promise<Partial<Phase2StateType>> {
  return composeAgent.runAddAudio(getNodeCtx(), state);
}

// Approval nodes - use interrupt() for human-in-the-loop
export function outlineApprovalNode(state: Phase2StateType): Partial<Phase2StateType> {
  const approved = interrupt({
    question: "Approve the story outline?",
    gate: "outline_approval",
    current_stage: state.currentStage,
  });
  return {
    currentStage: "outline_approval",
    approvalHistory: { ...state.approvalHistory, outline: approved ? "approved" : "rejected" },
  };
}

export function charactersApprovalNode(state: Phase2StateType): Partial<Phase2StateType> {
  const approved = interrupt({
    question: "Approve the character designs?",
    gate: "characters_approval",
  });
  return {
    currentStage: "characters_approval",
    approvalHistory: { ...state.approvalHistory, characters: approved ? "approved" : "rejected" },
  };
}

export function shotsApprovalNode(state: Phase2StateType): Partial<Phase2StateType> {
  const approved = interrupt({ question: "Approve the shot scripts?", gate: "shots_approval" });
  return {
    currentStage: "shots_approval",
    approvalHistory: { ...state.approvalHistory, shots: approved ? "approved" : "rejected" },
  };
}

export function characterImagesApprovalNode(state: Phase2StateType): Partial<Phase2StateType> {
  const approved = interrupt({ question: "Approve the character images?", gate: "character_images_approval" });
  return {
    currentStage: "character_images_approval",
    approvalHistory: { ...state.approvalHistory, characterImages: approved ? "approved" : "rejected" },
  };
}

export function shotImagesApprovalNode(state: Phase2StateType): Partial<Phase2StateType> {
  const approved = interrupt({ question: "Approve the shot images?", gate: "shot_images_approval" });
  return {
    currentStage: "shot_images_approval",
    approvalHistory: { ...state.approvalHistory, shotImages: approved ? "approved" : "rejected" },
  };
}

export function composeApprovalNode(state: Phase2StateType): Partial<Phase2StateType> {
  const approved = interrupt({ question: "Approve the final composition?", gate: "compose_approval" });
  return {
    currentStage: "compose_approval",
    approvalHistory: { ...state.approvalHistory, compose: approved ? "approved" : "rejected" },
  };
}

export async function critiqueCharacterImagesNode(state: Phase2StateType): Promise<Partial<Phase2StateType>> {
  return criticAgent.reviewCharacters(getNodeCtx(), state);
}

export async function critiqueShotImagesNode(state: Phase2StateType): Promise<Partial<Phase2StateType>> {
  return criticAgent.reviewShots(getNodeCtx(), state);
}

export async function reviewNode(state: Phase2StateType): Promise<Partial<Phase2StateType>> {
  return reviewEngine.run(getNodeCtx(), state);
}

// ── Routing functions ──
type RouteKey = string;

export function routeFromStart(state: Phase2StateType): RouteKey {
  return state.currentStage || "plan_outline";
}

export function routeAfterOutlineApproval(state: Phase2StateType): RouteKey {
  if (state.reviewRequested) return "review";
  const approved = state.approvalHistory?.outline;
  return approved === "approved" ? "plan_characters" : "plan_outline";
}

export function routeAfterCharactersApproval(state: Phase2StateType): RouteKey {
  if (state.reviewRequested) return "review";
  return state.approvalHistory?.characters === "approved" ? "plan_shots" : "review";
}

export function routeAfterShotsApproval(state: Phase2StateType): RouteKey {
  if (state.reviewRequested) return "review";
  return state.approvalHistory?.shots === "approved" ? "render_characters" : "review";
}

export function routeAfterCharacterImagesApproval(state: Phase2StateType): RouteKey {
  if (state.reviewRequested) return "review";
  return "critique_character_images";
}

export function routeAfterShotImagesApproval(state: Phase2StateType): RouteKey {
  if (state.reviewRequested) return "review";
  return "critique_shot_images";
}

export function routeAfterComposeVideos(_state: Phase2StateType): RouteKey {
  return "compose_merge";
}

export function routeAfterComposeMerge(_state: Phase2StateType): RouteKey {
  return "add_audio";
}

export function routeAfterComposeApproval(state: Phase2StateType): RouteKey {
  if (state.reviewRequested) return "review";
  return state.approvalHistory?.compose === "approved" ? "__end__" : "review";
}

export function routeAfterCritiqueCharacterImages(state: Phase2StateType): RouteKey {
  const scores = state.critiqueScores || {};
  const round = state.critiqueRound || 1;
  const scoreKey = `characters_round_${round}`;
  const score = scores[scoreKey] ?? 0;
  return (score >= 7 || round >= 2) ? "render_shots" : "render_characters";
}

export function routeAfterCritiqueShotImages(state: Phase2StateType): RouteKey {
  const scores = state.critiqueScores || {};
  const round = state.critiqueRound || 1;
  const scoreKey = `shots_round_${round}`;
  const score = scores[scoreKey] ?? 0;
  return (score >= 7 || round >= 2) ? "compose_videos" : "render_shots";
}

export function routeAfterReview(state: Phase2StateType): RouteKey {
  return state.routeStage || "plan_outline";
}
