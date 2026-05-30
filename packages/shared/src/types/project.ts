import { z } from "zod";

// ── Enums ──
export const ReviewState = z.enum(["draft", "approved", "superseded"]);
export type ReviewState = z.infer<typeof ReviewState>;

export const ProjectStatus = z.enum(["draft", "generating", "completed", "failed"]);
export type ProjectStatus = z.infer<typeof ProjectStatus>;

export const VersionEntityType = z.enum(["character", "shot"]);
export type VersionEntityType = z.infer<typeof VersionEntityType>;

// ── Story Outline ──
export const StoryOutlineActSchema = z.object({
  act: z.number(),
  title: z.string(),
  summary: z.string(),
});
export type StoryOutlineAct = z.infer<typeof StoryOutlineActSchema>;

export const StoryOutlineSchema = z.object({
  logline: z.string(),
  genre: z.array(z.string()),
  themes: z.array(z.string()),
  setting: z.string(),
  tone: z.string(),
  acts: z.array(StoryOutlineActSchema),
  emotionalArc: z.string(),
});
export type StoryOutline = z.infer<typeof StoryOutlineSchema>;

// ── Provider Settings ──
export const ProjectProviderEntrySchema = z.object({
  selectedKey: z.string(),
  source: z.enum(["project", "default"]),
  resolvedKey: z.string().nullable(),
  valid: z.boolean(),
  status: z.enum(["valid", "degraded", "invalid"]).nullable().optional(),
  reasonCode: z.string().nullable(),
  reasonMessage: z.string().nullable(),
  capabilities: z
    .object({
      generate: z.boolean().nullable().optional(),
      stream: z.boolean().nullable().optional(),
    })
    .nullable()
    .optional(),
});
export type ProjectProviderEntry = z.infer<typeof ProjectProviderEntrySchema>;

export const ProjectProviderSettingsSchema = z.object({
  text: ProjectProviderEntrySchema,
  image: ProjectProviderEntrySchema,
  video: ProjectProviderEntrySchema,
});
export type ProjectProviderSettings = z.infer<typeof ProjectProviderSettingsSchema>;

// ── Project ──
export const ProjectSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  story: z.string().nullable(),
  style: z.string().nullable(),
  summary: z.string().nullable(),
  storyOutline: StoryOutlineSchema.nullable().optional(),
  visualBible: z.string().nullable().optional(),
  outlineApproved: z.boolean().optional(),
  videoUrl: z.string().nullable(),
  status: z.string(),
  targetShotCount: z.number().nullable(),
  characterHints: z.array(z.string()),
  creationMode: z.string().nullable(),
  referenceImages: z.array(z.string()),
  exports: z.array(z.string()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  providerSettings: ProjectProviderSettingsSchema,
  universeId: z.string().uuid().nullable().optional(),
  chapterNumber: z.number().nullable().optional(),
  chapterTitle: z.string().nullable().optional(),
});
export type Project = z.infer<typeof ProjectSchema>;

// ── Character ──
export const CharacterSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  referenceImages: z.array(z.string()).optional(),
  hasEmbedding: z.boolean().optional(),
  visualNotes: z.string().nullable().optional(),
  approvalState: ReviewState,
  approvalVersion: z.number(),
  approvedAt: z.string().datetime().nullable(),
  approvedName: z.string().nullable(),
  approvedDescription: z.string().nullable(),
  approvedImageUrl: z.string().nullable(),
});
export type Character = z.infer<typeof CharacterSchema>;

// ── Shot ──
export const ShotSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  order: z.number(),
  description: z.string(),
  prompt: z.string().nullable(),
  imagePrompt: z.string().nullable(),
  imageUrl: z.string().nullable(),
  videoUrl: z.string().nullable(),
  duration: z.number().nullable(),
  camera: z.string().nullable(),
  motionNote: z.string().nullable(),
  scene: z.string().nullable(),
  action: z.string().nullable(),
  expression: z.string().nullable(),
  lighting: z.string().nullable(),
  dialogue: z.string().nullable(),
  sfx: z.string().nullable(),
  ttsUrl: z.string().nullable().optional(),
  bgmType: z.string().nullable().optional(),
  seed: z.number().nullable(),
  characterIds: z.array(z.string().uuid()),
  approvalState: ReviewState,
  approvalVersion: z.number(),
  approvedAt: z.string().datetime().nullable(),
  approvedDescription: z.string().nullable(),
  approvedPrompt: z.string().nullable(),
  approvedImagePrompt: z.string().nullable(),
  approvedDuration: z.number().nullable(),
  approvedCamera: z.string().nullable(),
  approvedMotionNote: z.string().nullable(),
  approvedScene: z.string().nullable(),
  approvedAction: z.string().nullable(),
  approvedExpression: z.string().nullable(),
  approvedLighting: z.string().nullable(),
  approvedDialogue: z.string().nullable(),
  approvedSfx: z.string().nullable(),
  approvedCharacterIds: z.array(z.string().uuid()),
});
export type Shot = z.infer<typeof ShotSchema>;

// ── Payloads ──
export const CreateProjectPayloadSchema = z.object({
  title: z.string().min(1).max(200),
  story: z.string().optional(),
  style: z.string().optional(),
  targetShotCount: z.number().optional(),
  characterHints: z.array(z.string()).optional(),
  creationMode: z.string().optional(),
  referenceImages: z.array(z.string()).optional(),
  universeId: z.string().uuid().nullable().optional(),
  chapterNumber: z.number().nullable().optional(),
  chapterTitle: z.string().nullable().optional(),
  textProviderOverride: z.string().nullable().optional(),
  imageProviderOverride: z.string().nullable().optional(),
  videoProviderOverride: z.string().nullable().optional(),
});
export type CreateProjectPayload = z.infer<typeof CreateProjectPayloadSchema>;

export const CharacterUpdatePayloadSchema = z.object({
  name: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  visualNotes: z.string().nullable().optional(),
  referenceImages: z.array(z.string()).nullable().optional(),
});
export type CharacterUpdatePayload = z.infer<typeof CharacterUpdatePayloadSchema>;

export const ShotUpdatePayloadSchema = z.object({
  order: z.number().nullable().optional(),
  description: z.string().nullable().optional(),
  prompt: z.string().nullable().optional(),
  imagePrompt: z.string().nullable().optional(),
  duration: z.number().nullable().optional(),
  camera: z.string().nullable().optional(),
  motionNote: z.string().nullable().optional(),
  scene: z.string().nullable().optional(),
  action: z.string().nullable().optional(),
  expression: z.string().nullable().optional(),
  lighting: z.string().nullable().optional(),
  dialogue: z.string().nullable().optional(),
  sfx: z.string().nullable().optional(),
  seed: z.number().nullable().optional(),
  characterIds: z.array(z.string().uuid()).nullable().optional(),
});
export type ShotUpdatePayload = z.infer<typeof ShotUpdatePayloadSchema>;

// ── Blocking Clip ──
export const BlockingClipSchema = z.object({
  shotId: z.string().uuid(),
  order: z.number(),
  status: z.string(),
  reason: z.string(),
});
export type BlockingClip = z.infer<typeof BlockingClipSchema>;

// ── Style Template ──
export const StyleTemplateSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  category: z.enum(["builtin", "custom"]),
  description: z.string().nullable(),
  stylePrompt: z.string(),
  colorPalette: z.array(z.string()),
  negativePrompt: z.string().nullable(),
  previewImageUrl: z.string().nullable(),
  sortOrder: z.number(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type StyleTemplate = z.infer<typeof StyleTemplateSchema>;

// ── Asset ──
export const AssetSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  assetType: z.enum(["character", "scene"]),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  metadataJson: z.string().nullable(),
  sourceProjectId: z.string().uuid().nullable(),
  tags: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Asset = z.infer<typeof AssetSchema>;

// ── Consistency ──
export const FaceMatchDetailSchema = z.object({
  shotId: z.string().uuid(),
  shotOrder: z.number(),
  similarity: z.number(),
  detected: z.boolean(),
});
export type FaceMatchDetail = z.infer<typeof FaceMatchDetailSchema>;

export const CharacterConsistencySchema = z.object({
  characterId: z.string().uuid(),
  characterName: z.string(),
  faceSimilarityMean: z.number(),
  faceSimilarityStd: z.number(),
  presenceRate: z.number(),
  overallScore: z.number(),
  faceMatches: z.array(FaceMatchDetailSchema),
  grade: z.string(),
});
export type CharacterConsistency = z.infer<typeof CharacterConsistencySchema>;

// ── Universe ──
export const SharedCharacterSchema = z.object({
  id: z.string().uuid(),
  universeId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  visualNotes: z.string().nullable(),
  canonicalImageUrl: z.string().nullable(),
  referenceImages: z.array(z.string()),
  hasEmbedding: z.boolean(),
  characterTags: z.string().nullable(),
  sourceProjectId: z.string().uuid().nullable(),
  sourceCharacterId: z.string().uuid().nullable(),
  version: z.number(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  referenceImagesCount: z.number(),
});
export type SharedCharacter = z.infer<typeof SharedCharacterSchema>;

export const UniverseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  worldSetting: z.string().nullable(),
  styleRules: z.string().nullable(),
  coverImageUrl: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  projectsCount: z.number(),
  sharedCharactersCount: z.number(),
});
export type Universe = z.infer<typeof UniverseSchema>;
