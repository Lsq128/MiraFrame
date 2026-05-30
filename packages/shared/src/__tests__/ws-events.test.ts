import { describe, it, expect } from "vitest";
import {
  WsEventSchema,
  WsEventType,
  RunProgressEventDataSchema,
  RunStartedEventDataSchema,
  RunMessageEventDataSchema,
  RunCompletedEventDataSchema,
  RunFailedEventDataSchema,
  RunCancelledEventDataSchema,
  RunAwaitingConfirmEventDataSchema,
  RunConfirmedEventDataSchema,
  AgentThinkingEventDataSchema,
  CritiqueResultEventDataSchema,
  VersionCreatedEventDataSchema,
  VersionRollbackEventDataSchema,
  AudioGeneratedEventDataSchema,
  ExportCompletedEventDataSchema,
  ConsistencyEvalCompletedEventDataSchema,
  OutlineUpdatedEventDataSchema,
  BibleUpdatedEventDataSchema,
  CharacterCreatedEventDataSchema,
  CharacterUpdatedEventDataSchema,
  CharacterDeletedEventDataSchema,
  ShotCreatedEventDataSchema,
  ShotUpdatedEventDataSchema,
  ShotDeletedEventDataSchema,
} from "../types/ws-events";

describe("WsEventSchema", () => {
  it("validates a basic event", () => {
    const event = { type: "run_progress", data: { runId: "550e8400-e29b-41d4-a716-446655440000", progress: 0.5 } };
    expect(WsEventSchema.safeParse(event).success).toBe(true);
  });

  it("rejects invalid event type", () => {
    const event = { type: "nonexistent", data: {} };
    expect(WsEventSchema.safeParse(event).success).toBe(false);
  });
});

describe("WsEventType", () => {
  it("includes all 29 event types", () => {
    expect(WsEventType.options.length).toBe(29);
  });
});

describe("RunProgressEventDataSchema", () => {
  it("validates progress data", () => {
    expect(
      RunProgressEventDataSchema.safeParse({
        runId: "550e8400-e29b-41d4-a716-446655440000",
        progress: 0.75,
      }).success
    ).toBe(true);
  });

  it("rejects progress out of range", () => {
    expect(
      RunProgressEventDataSchema.safeParse({
        runId: "550e8400-e29b-41d4-a716-446655440000",
        progress: 2.5,
      }).success
    ).toBe(false);
  });
});

describe("RunStartedEventDataSchema", () => {
  it("validates run started data", () => {
    expect(
      RunStartedEventDataSchema.safeParse({
        runId: "550e8400-e29b-41d4-a716-446655440000",
      }).success
    ).toBe(true);
  });
});

describe("RunMessageEventDataSchema", () => {
  it("validates a message event", () => {
    expect(
      RunMessageEventDataSchema.safeParse({
        content: "Hello world",
      }).success
    ).toBe(true);
  });

  it("rejects missing content", () => {
    expect(RunMessageEventDataSchema.safeParse({}).success).toBe(false);
  });
});

describe("RunCompletedEventDataSchema", () => {
  it("validates completed event", () => {
    expect(RunCompletedEventDataSchema.safeParse({}).success).toBe(true);
  });
});

describe("RunFailedEventDataSchema", () => {
  it("validates failed event", () => {
    expect(
      RunFailedEventDataSchema.safeParse({
        error: "Something went wrong",
      }).success
    ).toBe(true);
  });
});

describe("RunCancelledEventDataSchema", () => {
  it("validates cancelled event", () => {
    expect(RunCancelledEventDataSchema.safeParse({}).success).toBe(true);
  });
});

describe("RunAwaitingConfirmEventDataSchema", () => {
  it("validates awaiting confirm", () => {
    const data = {
      runId: "550e8400-e29b-41d4-a716-446655440000",
      agent: "outline",
      recoverySummary: {
        projectId: "550e8400-e29b-41d4-a716-446655440001",
        runId: "550e8400-e29b-41d4-a716-446655440000",
        threadId: "thread-123",
        currentStage: "plan_outline",
        nextStage: "outline_approval",
        preservedStages: ["plan_outline"],
        stageHistory: [],
        resumable: true,
      },
    };
    expect(RunAwaitingConfirmEventDataSchema.safeParse(data).success).toBe(true);
  });
});

describe("RunConfirmedEventDataSchema", () => {
  it("validates confirmed event", () => {
    expect(
      RunConfirmedEventDataSchema.safeParse({
        runId: "550e8400-e29b-41d4-a716-446655440000",
        agent: "outline",
      }).success
    ).toBe(true);
  });
});

describe("AgentThinkingEventDataSchema", () => {
  it("validates thinking event", () => {
    expect(
      AgentThinkingEventDataSchema.safeParse({
        agent: "outline",
        phase: "reasoning",
        content: "Thinking about the plot...",
      }).success
    ).toBe(true);
  });

  it("rejects invalid phase", () => {
    expect(
      AgentThinkingEventDataSchema.safeParse({
        agent: "outline",
        phase: "invalid",
        content: "test",
      }).success
    ).toBe(false);
  });
});

describe("CritiqueResultEventDataSchema", () => {
  it("validates critique result", () => {
    expect(
      CritiqueResultEventDataSchema.safeParse({
        score: 7,
        dimensions: { clarity: 8, creativity: 6 },
        issues: ["Flat lighting"],
        suggestions: ["Add rim light"],
        entityType: "shot",
        entityId: "550e8400-e29b-41d4-a716-446655440002",
        willRegenerate: false,
      }).success
    ).toBe(true);
  });

  it("rejects score out of range", () => {
    expect(
      CritiqueResultEventDataSchema.safeParse({
        score: 15,
        dimensions: {},
        issues: [],
        suggestions: [],
        entityType: "shot",
        entityId: "550e8400-e29b-41d4-a716-446655440002",
        willRegenerate: false,
      }).success
    ).toBe(false);
  });
});

describe("VersionCreatedEventDataSchema", () => {
  it("validates version created", () => {
    expect(
      VersionCreatedEventDataSchema.safeParse({
        entityType: "character",
        entityId: "550e8400-e29b-41d4-a716-446655440001",
        version: 2,
        trigger: "manual",
      }).success
    ).toBe(true);
  });
});

describe("VersionRollbackEventDataSchema", () => {
  it("validates version rollback", () => {
    expect(
      VersionRollbackEventDataSchema.safeParse({
        entityType: "shot",
        entityId: "550e8400-e29b-41d4-a716-446655440002",
        fromVersion: 5,
        toVersion: 3,
      }).success
    ).toBe(true);
  });
});

describe("AudioGeneratedEventDataSchema", () => {
  it("validates audio generated", () => {
    expect(
      AudioGeneratedEventDataSchema.safeParse({
        shotId: "550e8400-e29b-41d4-a716-446655440002",
      }).success
    ).toBe(true);
  });
});

describe("ExportCompletedEventDataSchema", () => {
  it("validates export completed success", () => {
    expect(
      ExportCompletedEventDataSchema.safeParse({
        exportId: "export-123",
        format: "mp4",
        downloadUrl: "http://example.com/video.mp4",
        status: "completed",
      }).success
    ).toBe(true);
  });

  it("validates export completed failure", () => {
    expect(
      ExportCompletedEventDataSchema.safeParse({
        exportId: "export-456",
        format: "mp4",
        status: "failed",
        error: "Encoding failed",
      }).success
    ).toBe(true);
  });
});

describe("ConsistencyEvalCompletedEventDataSchema", () => {
  it("validates consistency eval", () => {
    expect(
      ConsistencyEvalCompletedEventDataSchema.safeParse({
        projectId: "550e8400-e29b-41d4-a716-446655440000",
        overallScore: 85,
        characterCount: 3,
      }).success
    ).toBe(true);
  });
});

describe("OutlineUpdatedEventDataSchema", () => {
  it("validates outline updated", () => {
    expect(
      OutlineUpdatedEventDataSchema.safeParse({
        projectId: "550e8400-e29b-41d4-a716-446655440000",
        outlineApproved: true,
      }).success
    ).toBe(true);
  });
});

describe("BibleUpdatedEventDataSchema", () => {
  it("validates bible updated", () => {
    expect(
      BibleUpdatedEventDataSchema.safeParse({
        characterId: "550e8400-e29b-41d4-a716-446655440001",
        visualNotes: true,
        referenceImagesCount: 3,
        hasEmbedding: true,
      }).success
    ).toBe(true);
  });
});

describe("Character event schemas", () => {
  const character = {
    id: "550e8400-e29b-41d4-a716-446655440001",
    projectId: "550e8400-e29b-41d4-a716-446655440000",
    name: "Hero",
    description: null,
    imageUrl: null,
    approvalState: "draft",
    approvalVersion: 1,
    approvedAt: null,
    approvedName: null,
    approvedDescription: null,
    approvedImageUrl: null,
  };

  it("validates character created", () => {
    expect(CharacterCreatedEventDataSchema.safeParse({ character }).success).toBe(true);
  });

  it("validates character updated", () => {
    expect(CharacterUpdatedEventDataSchema.safeParse({ character }).success).toBe(true);
  });

  it("validates character deleted", () => {
    expect(
      CharacterDeletedEventDataSchema.safeParse({
        characterId: "550e8400-e29b-41d4-a716-446655440001",
      }).success
    ).toBe(true);
  });
});

describe("Shot event schemas", () => {
  const shot = {
    id: "550e8400-e29b-41d4-a716-446655440002",
    projectId: "550e8400-e29b-41d4-a716-446655440000",
    order: 1,
    description: "Test",
    prompt: null,
    imagePrompt: null,
    imageUrl: null,
    videoUrl: null,
    duration: null,
    camera: null,
    motionNote: null,
    scene: null,
    action: null,
    expression: null,
    lighting: null,
    dialogue: null,
    sfx: null,
    seed: null,
    characterIds: [],
    approvalState: "draft",
    approvalVersion: 0,
    approvedAt: null,
    approvedDescription: null,
    approvedPrompt: null,
    approvedImagePrompt: null,
    approvedDuration: null,
    approvedCamera: null,
    approvedMotionNote: null,
    approvedScene: null,
    approvedAction: null,
    approvedExpression: null,
    approvedLighting: null,
    approvedDialogue: null,
    approvedSfx: null,
    approvedCharacterIds: [],
  };

  it("validates shot created", () => {
    expect(ShotCreatedEventDataSchema.safeParse({ shot }).success).toBe(true);
  });

  it("validates shot updated", () => {
    expect(ShotUpdatedEventDataSchema.safeParse({ shot }).success).toBe(true);
  });

  it("validates shot deleted", () => {
    expect(
      ShotDeletedEventDataSchema.safeParse({
        shotId: "550e8400-e29b-41d4-a716-446655440002",
      }).success
    ).toBe(true);
  });
});
