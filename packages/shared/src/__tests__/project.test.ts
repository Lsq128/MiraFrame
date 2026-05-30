import { describe, it, expect } from "vitest";
import { ProjectSchema, CharacterSchema, ShotSchema, StoryOutlineSchema, ReviewState, ProjectStatus, BlockingClipSchema, StyleTemplateSchema, AssetSchema, CharacterConsistencySchema, FaceMatchDetailSchema, UniverseSchema, SharedCharacterSchema, CreateProjectPayloadSchema, CharacterUpdatePayloadSchema, ShotUpdatePayloadSchema } from "../types/project";

describe("ProjectSchema", () => {
  it("validates a valid project", () => {
    const project = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      title: "Test Project",
      story: null,
      style: null,
      summary: null,
      videoUrl: null,
      status: "draft",
      targetShotCount: null,
      characterHints: [],
      creationMode: null,
      referenceImages: [],
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      providerSettings: {
        text: { selectedKey: "anthropic", source: "default", resolvedKey: "anthropic", valid: true, reasonCode: null, reasonMessage: null },
        image: { selectedKey: "openai", source: "default", resolvedKey: "openai", valid: true, reasonCode: null, reasonMessage: null },
        video: { selectedKey: "openai", source: "default", resolvedKey: "openai", valid: true, reasonCode: null, reasonMessage: null },
      },
    };
    const result = ProjectSchema.safeParse(project);
    expect(result.success).toBe(true);
  });

  it("rejects invalid project (missing title)", () => {
    const result = ProjectSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects invalid id format", () => {
    const project = {
      id: "not-a-uuid",
      title: "Test",
      story: null,
      style: null,
      summary: null,
      videoUrl: null,
      status: "draft",
      targetShotCount: null,
      characterHints: [],
      creationMode: null,
      referenceImages: [],
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      providerSettings: {
        text: { selectedKey: "a", source: "default", resolvedKey: "a", valid: true, reasonCode: null, reasonMessage: null },
        image: { selectedKey: "a", source: "default", resolvedKey: "a", valid: true, reasonCode: null, reasonMessage: null },
        video: { selectedKey: "a", source: "default", resolvedKey: "a", valid: true, reasonCode: null, reasonMessage: null },
      },
    };
    expect(ProjectSchema.safeParse(project).success).toBe(false);
  });
});

describe("StoryOutlineSchema", () => {
  it("validates a complete outline", () => {
    const outline = {
      logline: "A story",
      genre: ["fantasy"],
      themes: ["love"],
      setting: "Tokyo",
      tone: "dark",
      acts: [{ act: 1, title: "Beginning", summary: "Starts here" }],
      emotionalArc: "rise-fall",
    };
    expect(StoryOutlineSchema.safeParse(outline).success).toBe(true);
  });

  it("rejects outline missing required fields", () => {
    expect(StoryOutlineSchema.safeParse({}).success).toBe(false);
  });
});

describe("ReviewState", () => {
  it("accepts valid states", () => {
    expect(ReviewState.safeParse("draft").success).toBe(true);
    expect(ReviewState.safeParse("approved").success).toBe(true);
    expect(ReviewState.safeParse("superseded").success).toBe(true);
  });

  it("rejects invalid state", () => {
    expect(ReviewState.safeParse("invalid").success).toBe(false);
  });
});

describe("ProjectStatus", () => {
  it("accepts valid statuses", () => {
    expect(ProjectStatus.safeParse("draft").success).toBe(true);
    expect(ProjectStatus.safeParse("generating").success).toBe(true);
    expect(ProjectStatus.safeParse("completed").success).toBe(true);
    expect(ProjectStatus.safeParse("failed").success).toBe(true);
  });

  it("rejects invalid status", () => {
    expect(ProjectStatus.safeParse("unknown").success).toBe(false);
  });
});

describe("CharacterSchema", () => {
  it("validates a valid character", () => {
    const character = {
      id: "550e8400-e29b-41d4-a716-446655440001",
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      name: "Hero",
      description: null,
      imageUrl: null,
      approvalState: "draft",
      approvalVersion: 0,
      approvedAt: null,
      approvedName: null,
      approvedDescription: null,
      approvedImageUrl: null,
    };
    expect(CharacterSchema.safeParse(character).success).toBe(true);
  });

  it("rejects character without name", () => {
    expect(CharacterSchema.safeParse({ id: "550e8400-e29b-41d4-a716-446655440001", projectId: "550e8400-e29b-41d4-a716-446655440000" }).success).toBe(false);
  });
});

describe("ShotSchema", () => {
  it("validates a valid shot", () => {
    const shot = {
      id: "550e8400-e29b-41d4-a716-446655440002",
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      order: 1,
      description: "A test shot",
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
    expect(ShotSchema.safeParse(shot).success).toBe(true);
  });
});

describe("BlockingClipSchema", () => {
  it("validates a blocking clip", () => {
    const clip = {
      shotId: "550e8400-e29b-41d4-a716-446655440002",
      order: 1,
      status: "pending",
      reason: "Awaiting character",
    };
    expect(BlockingClipSchema.safeParse(clip).success).toBe(true);
  });
});

describe("StyleTemplateSchema", () => {
  it("validates a style template", () => {
    const tmpl = {
      id: "550e8400-e29b-41d4-a716-446655440003",
      name: "Anime Style",
      slug: "anime-style",
      category: "builtin",
      description: null,
      stylePrompt: "Anime illustration",
      colorPalette: ["#FF0000", "#00FF00"],
      negativePrompt: null,
      previewImageUrl: null,
      sortOrder: 0,
      isActive: true,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };
    expect(StyleTemplateSchema.safeParse(tmpl).success).toBe(true);
  });
});

describe("AssetSchema", () => {
  it("validates an asset", () => {
    const asset = {
      id: "550e8400-e29b-41d4-a716-446655440004",
      name: "Main Character",
      assetType: "character",
      description: null,
      imageUrl: null,
      metadataJson: null,
      sourceProjectId: null,
      tags: null,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };
    expect(AssetSchema.safeParse(asset).success).toBe(true);
  });

  it("rejects invalid asset type", () => {
    const asset = {
      id: "550e8400-e29b-41d4-a716-446655440004",
      name: "Test",
      assetType: "invalid",
      description: null,
      imageUrl: null,
      metadataJson: null,
      sourceProjectId: null,
      tags: null,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };
    expect(AssetSchema.safeParse(asset).success).toBe(false);
  });
});

describe("CharacterConsistencySchema", () => {
  it("validates character consistency", () => {
    const consistency = {
      characterId: "550e8400-e29b-41d4-a716-446655440001",
      characterName: "Hero",
      faceSimilarityMean: 0.85,
      faceSimilarityStd: 0.05,
      presenceRate: 1.0,
      overallScore: 90,
      faceMatches: [
        { shotId: "550e8400-e29b-41d4-a716-446655440002", shotOrder: 1, similarity: 0.9, detected: true },
      ],
      grade: "A",
    };
    expect(CharacterConsistencySchema.safeParse(consistency).success).toBe(true);
  });
});

describe("FaceMatchDetailSchema", () => {
  it("validates face match detail", () => {
    const detail = {
      shotId: "550e8400-e29b-41d4-a716-446655440002",
      shotOrder: 1,
      similarity: 0.92,
      detected: true,
    };
    expect(FaceMatchDetailSchema.safeParse(detail).success).toBe(true);
  });
});

describe("UniverseSchema", () => {
  it("validates a universe", () => {
    const universe = {
      id: "550e8400-e29b-41d4-a716-446655440005",
      name: "My Universe",
      description: null,
      worldSetting: null,
      styleRules: null,
      coverImageUrl: null,
      isActive: true,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      projectsCount: 0,
      sharedCharactersCount: 0,
    };
    expect(UniverseSchema.safeParse(universe).success).toBe(true);
  });
});

describe("SharedCharacterSchema", () => {
  it("validates a shared character", () => {
    const sc = {
      id: "550e8400-e29b-41d4-a716-446655440006",
      universeId: "550e8400-e29b-41d4-a716-446655440005",
      name: "Cross-Universe Hero",
      description: null,
      visualNotes: null,
      canonicalImageUrl: null,
      referenceImages: [],
      hasEmbedding: false,
      characterTags: null,
      sourceProjectId: null,
      sourceCharacterId: null,
      version: 1,
      isActive: true,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
      referenceImagesCount: 0,
    };
    expect(SharedCharacterSchema.safeParse(sc).success).toBe(true);
  });
});

describe("CreateProjectPayloadSchema", () => {
  it("validates minimal create payload", () => {
    expect(CreateProjectPayloadSchema.safeParse({ title: "New Project" }).success).toBe(true);
  });

  it("validates full create payload", () => {
    const payload = {
      title: "Full Project",
      story: "Once upon a time...",
      style: "Anime",
      targetShotCount: 10,
      characterHints: ["hero", "villain"],
      creationMode: "manual",
      referenceImages: ["http://example.com/img.png"],
    };
    expect(CreateProjectPayloadSchema.safeParse(payload).success).toBe(true);
  });
});

describe("CharacterUpdatePayloadSchema", () => {
  it("validates empty update (all optional)", () => {
    expect(CharacterUpdatePayloadSchema.safeParse({}).success).toBe(true);
  });
});

describe("ShotUpdatePayloadSchema", () => {
  it("validates empty update (all optional)", () => {
    expect(ShotUpdatePayloadSchema.safeParse({}).success).toBe(true);
  });
});
