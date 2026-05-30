import { z } from "zod";
import { StoryOutlineSchema, CharacterSchema, ShotSchema } from "./project";
import { RecoverySummarySchema } from "./agent";

// ── WsEventType ──
export const WsEventType = z.enum([
  "connected",
  "pong",
  "echo",
  "error",
  "run_started",
  "run_progress",
  "run_message",
  "agent_thinking",
  "run_completed",
  "run_failed",
  "run_awaiting_confirm",
  "run_confirmed",
  "run_cancelled",
  "character_created",
  "character_updated",
  "character_deleted",
  "shot_created",
  "shot_updated",
  "shot_deleted",
  "outline_updated",
  "project_updated",
  "data_cleared",
  "critique_result",
  "bible_updated",
  "version_created",
  "version_rollback",
  "audio_generated",
  "export_completed",
  "consistency_eval_completed",
]);
export type WsEventType = z.infer<typeof WsEventType>;

// ── Event Data Schemas ──
export const RunProgressEventDataSchema = z.object({
  runId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  currentAgent: z.string().nullable().optional(),
  currentStage: z.string().nullable().optional(),
  stage: z.string().nullable().optional(),
  nextStage: z.string().nullable().optional(),
  progress: z.number().min(0).max(1),
  recoverySummary: RecoverySummarySchema.nullable().optional(),
});
export type RunProgressEventData = z.infer<typeof RunProgressEventDataSchema>;

export const RunStartedEventDataSchema = z.object({
  runId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  providerSnapshot: z.record(z.unknown()).nullable().optional(),
  currentStage: z.string().nullable().optional(),
  stage: z.string().nullable().optional(),
  nextStage: z.string().nullable().optional(),
  progress: z.number().min(0).max(1).optional(),
  currentAgent: z.string().nullable().optional(),
  recoverySummary: RecoverySummarySchema.nullable().optional(),
  preservedStages: z.array(z.string()).optional(),
});
export type RunStartedEventData = z.infer<typeof RunStartedEventDataSchema>;

export const RunMessageEventDataSchema = z.object({
  agent: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
  content: z.string(),
  summary: z.string().nullable().optional(),
  progress: z.number().min(0).max(1).nullable().optional(),
  isLoading: z.boolean().nullable().optional(),
});
export type RunMessageEventData = z.infer<typeof RunMessageEventDataSchema>;

export const RunCompletedEventDataSchema = z.object({
  runId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  currentStage: z.string().nullable().optional(),
  currentAgent: z.string().nullable().optional(),
  message: z.string().nullable().optional(),
  videoGenerationPending: z.boolean().nullable().optional(),
});
export type RunCompletedEventData = z.infer<typeof RunCompletedEventDataSchema>;

export const RunFailedEventDataSchema = z.object({
  runId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  error: z.string().nullable().optional(),
  agent: z.string().nullable().optional(),
  currentStage: z.string().nullable().optional(),
});
export type RunFailedEventData = z.infer<typeof RunFailedEventDataSchema>;

export const RunCancelledEventDataSchema = z.object({
  runId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  runIds: z.array(z.string().uuid()).nullable().optional(),
  cancelledCount: z.number().nullable().optional(),
});
export type RunCancelledEventData = z.infer<typeof RunCancelledEventDataSchema>;

export const RunAwaitingConfirmEventDataSchema = z.object({
  runId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  agent: z.string(),
  gate: z.string().nullable().optional(),
  currentStage: z.string().nullable().optional(),
  stage: z.string().nullable().optional(),
  nextStage: z.string().nullable().optional(),
  recoverySummary: RecoverySummarySchema,
  preservedStages: z.array(z.string()).optional(),
  message: z.string().nullable().optional(),
  completed: z.string().nullable().optional(),
  nextStep: z.string().nullable().optional(),
  question: z.string().nullable().optional(),
  autoMode: z.boolean().nullable().optional(),
  storyOutline: StoryOutlineSchema.nullable().optional(),
  visualBible: z.string().nullable().optional(),
});
export type RunAwaitingConfirmEventData = z.infer<typeof RunAwaitingConfirmEventDataSchema>;

export const RunConfirmedEventDataSchema = z.object({
  runId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  agent: z.string(),
  gate: z.string().nullable().optional(),
  currentStage: z.string().nullable().optional(),
  stage: z.string().nullable().optional(),
  nextStage: z.string().nullable().optional(),
  recoverySummary: RecoverySummarySchema.nullable().optional(),
  autoMode: z.boolean().nullable().optional(),
});
export type RunConfirmedEventData = z.infer<typeof RunConfirmedEventDataSchema>;

export const AgentThinkingEventDataSchema = z.object({
  agent: z.string(),
  phase: z.enum(["reasoning", "decision", "planning", "reviewing"]),
  content: z.string(),
  details: z.string().nullable().optional(),
});
export type AgentThinkingEventData = z.infer<typeof AgentThinkingEventDataSchema>;

export const CritiqueResultEventDataSchema = z.object({
  score: z.number().min(0).max(10),
  dimensions: z.record(z.number()),
  issues: z.array(z.string()),
  suggestions: z.array(z.string()),
  entityType: z.string(),
  entityId: z.string().uuid(),
  willRegenerate: z.boolean(),
});
export type CritiqueResultEventData = z.infer<typeof CritiqueResultEventDataSchema>;

export const VersionCreatedEventDataSchema = z.object({
  entityType: z.enum(["character", "shot"]),
  entityId: z.string().uuid(),
  version: z.number(),
  trigger: z.string(),
});
export type VersionCreatedEventData = z.infer<typeof VersionCreatedEventDataSchema>;

export const VersionRollbackEventDataSchema = z.object({
  entityType: z.enum(["character", "shot"]),
  entityId: z.string().uuid(),
  fromVersion: z.number(),
  toVersion: z.number(),
});
export type VersionRollbackEventData = z.infer<typeof VersionRollbackEventDataSchema>;

export const AudioGeneratedEventDataSchema = z.object({
  shotId: z.string().uuid(),
  ttsUrl: z.string().nullable().optional(),
  bgmType: z.string().nullable().optional(),
  duration: z.number().nullable().optional(),
});
export type AudioGeneratedEventData = z.infer<typeof AudioGeneratedEventDataSchema>;

export const ExportCompletedEventDataSchema = z.object({
  exportId: z.string(),
  format: z.string(),
  downloadUrl: z.string().nullable().optional(),
  status: z.enum(["completed", "failed"]),
  error: z.string().nullable().optional(),
});
export type ExportCompletedEventData = z.infer<typeof ExportCompletedEventDataSchema>;

export const ConsistencyEvalCompletedEventDataSchema = z.object({
  projectId: z.string().uuid(),
  overallScore: z.number().min(0).max(100),
  characterCount: z.number(),
});
export type ConsistencyEvalCompletedEventData = z.infer<typeof ConsistencyEvalCompletedEventDataSchema>;

export const OutlineUpdatedEventDataSchema = z.object({
  projectId: z.string().uuid(),
  storyOutline: StoryOutlineSchema.nullable().optional(),
  visualBible: z.string().nullable().optional(),
  outlineApproved: z.boolean(),
});
export type OutlineUpdatedEventData = z.infer<typeof OutlineUpdatedEventDataSchema>;

export const BibleUpdatedEventDataSchema = z.object({
  characterId: z.string().uuid(),
  visualNotes: z.boolean(),
  referenceImagesCount: z.number(),
  hasEmbedding: z.boolean(),
});
export type BibleUpdatedEventData = z.infer<typeof BibleUpdatedEventDataSchema>;

// ── Character/Shot event wrappers ──
export const CharacterCreatedEventDataSchema = z.object({
  character: CharacterSchema,
});
export type CharacterCreatedEventData = z.infer<typeof CharacterCreatedEventDataSchema>;

export const CharacterUpdatedEventDataSchema = z.object({
  character: CharacterSchema,
});
export type CharacterUpdatedEventData = z.infer<typeof CharacterUpdatedEventDataSchema>;

export const CharacterDeletedEventDataSchema = z.object({
  characterId: z.string().uuid(),
});
export type CharacterDeletedEventData = z.infer<typeof CharacterDeletedEventDataSchema>;

export const ShotCreatedEventDataSchema = z.object({
  shot: ShotSchema,
});
export type ShotCreatedEventData = z.infer<typeof ShotCreatedEventDataSchema>;

export const ShotUpdatedEventDataSchema = z.object({
  shot: ShotSchema,
});
export type ShotUpdatedEventData = z.infer<typeof ShotUpdatedEventDataSchema>;

export const ShotDeletedEventDataSchema = z.object({
  shotId: z.string().uuid(),
});
export type ShotDeletedEventData = z.infer<typeof ShotDeletedEventDataSchema>;

// ── WsEvent wrapper ──
export const WsEventSchema = z.object({
  type: WsEventType,
  data: z.record(z.unknown()),
});
export type WsEvent = z.infer<typeof WsEventSchema>;
