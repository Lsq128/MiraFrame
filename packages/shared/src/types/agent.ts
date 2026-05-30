import { z } from "zod";
import { ProjectProviderSettingsSchema, StoryOutlineSchema } from "./project";

// ── Agent Run ──
export const AgentRunSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  status: z.string(),
  currentAgent: z.string().nullable(),
  progress: z.number(),
  error: z.string().nullable(),
  threadId: z.string().nullable(),
  resourceType: z.string().nullable(),
  resourceId: z.string().uuid().nullable(),
  providerSnapshot: ProjectProviderSettingsSchema.nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type AgentRun = z.infer<typeof AgentRunSchema>;

// ── Agent Message ──
export const AgentMessageSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  runId: z.string().uuid().nullable(),
  agent: z.string(),
  role: z.string(),
  content: z.string(),
  summary: z.string().nullable(),
  progress: z.number().nullable(),
  isLoading: z.boolean(),
  createdAt: z.string().datetime(),
});
export type AgentMessage = z.infer<typeof AgentMessageSchema>;

// ── Recovery ──
export const RecoveryStageSchema = z.object({
  name: z.string(),
  status: z.enum(["completed", "current", "pending", "blocked"]),
  artifactCount: z.number(),
});
export type RecoveryStage = z.infer<typeof RecoveryStageSchema>;

export const RecoverySummarySchema = z.object({
  projectId: z.string().uuid(),
  runId: z.string().uuid(),
  threadId: z.string(),
  currentStage: z.string(),
  nextStage: z.string().nullable(),
  preservedStages: z.array(z.string()),
  stageHistory: z.array(RecoveryStageSchema),
  resumable: z.boolean(),
});
export type RecoverySummary = z.infer<typeof RecoverySummarySchema>;

export const RecoveryControlSchema = z.object({
  state: z.enum(["active", "recoverable"]),
  detail: z.string(),
  availableActions: z.array(z.enum(["resume", "cancel"])),
  threadId: z.string(),
  activeRun: AgentRunSchema,
  recoverySummary: RecoverySummarySchema,
});
export type RecoveryControl = z.infer<typeof RecoveryControlSchema>;

// ── Run Status ──
export const RunStatus = z.enum(["queued", "running", "succeeded", "failed", "cancelled"]);
export type RunStatus = z.infer<typeof RunStatus>;
