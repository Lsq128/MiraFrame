import { describe, it, expect } from "vitest";
import { OutlineAgent } from "../agents/outline.js";
import { PlanAgent } from "../agents/plan.js";
import { CriticAgent } from "../agents/critic.js";
import { BaseAgent } from "../agents/base.js";
import { ReviewRuleEngine } from "../agents/review.js";
import type { AgentContext } from "../agents/base.js";
import type { Phase2StateType } from "../state.js";

function mockCtx(overrides?: Partial<AgentContext>): AgentContext {
  return {
    projectId: 0,
    runId: 0,
    threadId: "test",
    sendMessage: async () => { void 0; },
    sendThinking: async () => { void 0; },
    callLlm: async () => "{}",
    ...overrides,
  };
}

function mockState(overrides?: Partial<Phase2StateType>): Phase2StateType {
  return {
    projectId: "test",
    runId: "test",
    threadId: "test",
    currentStage: "plan_outline",
    nextStage: null,
    stageHistory: [],
    approvalHistory: {},
    critiqueScores: {},
    critiqueRound: 0,
    artifactLineage: {},
    routeStage: null,
    routeMode: "full",
    reviewRequested: false,
    ...overrides,
  } as Phase2StateType;
}

describe("OutlineAgent", () => {
  it("has correct name", () => {
    const agent = new OutlineAgent();
    expect(agent.name).toBe("outline");
  });

  it("is a BaseAgent", () => {
    const agent = new OutlineAgent();
    expect(agent).toBeInstanceOf(BaseAgent);
  });

  it("run returns state update with currentStage", async () => {
    const agent = new OutlineAgent();
    const ctx = mockCtx();
    const state = mockState();
    const result = await agent.run(ctx, state);
    expect(result.currentStage).toBe("plan_outline");
    expect(result.nextStage).toBe("outline_approval");
  });
});

describe("PlanAgent", () => {
  it("has correct name", () => {
    const agent = new PlanAgent();
    expect(agent.name).toBe("plan");
  });

  it("runCharacters returns state update", async () => {
    const agent = new PlanAgent();
    const ctx = mockCtx();
    const state = mockState();
    const result = await agent.runCharacters(ctx, state);
    expect(result.currentStage).toBe("plan_characters");
    expect(result.nextStage).toBe("characters_approval");
  });

  it("runShots returns state update", async () => {
    const agent = new PlanAgent();
    const ctx = mockCtx();
    const state = mockState();
    const result = await agent.runShots(ctx, state);
    expect(result.currentStage).toBe("plan_shots");
    expect(result.nextStage).toBe("shots_approval");
  });
});

describe("CriticAgent", () => {
  it("has correct name", () => {
    const agent = new CriticAgent();
    expect(agent.name).toBe("critic");
  });

  it("reviewCharacters returns scores and updates round", async () => {
    const agent = new CriticAgent();
    const ctx = mockCtx();
    const state = mockState({ critiqueRound: 0, critiqueScores: {} });
    const result = await agent.reviewCharacters(ctx, state);
    expect(result.critiqueRound).toBe(1);
    expect(result.critiqueScores).toBeDefined();
    expect(result.currentStage).toBe("critique_character_images");
  });

  it("reviewShots returns scores and updates round", async () => {
    const agent = new CriticAgent();
    const ctx = mockCtx();
    const state = mockState({ critiqueRound: 0, critiqueScores: {} });
    const result = await agent.reviewShots(ctx, state);
    expect(result.critiqueRound).toBe(1);
    expect(result.critiqueScores).toBeDefined();
    expect(result.currentStage).toBe("critique_shot_images");
  });
});

describe("ReviewRuleEngine", () => {
  it("has correct name", () => {
    const engine = new ReviewRuleEngine();
    expect(engine.name).toBe("review");
  });

  it("routes back to the correct stage", async () => {
    const engine = new ReviewRuleEngine();
    const ctx = mockCtx();
    const state = mockState({ currentStage: "outline_approval" });
    const result = await engine.run(ctx, state);
    expect(result.routeStage).toBe("plan_outline");
    expect(result.routeMode).toBe("incremental");
    expect(result.reviewRequested).toBe(false);
  });
});
