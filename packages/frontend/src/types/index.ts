// ============================================================
// Frontend Type Definitions — aligned with old project types
// ============================================================

import type React from "react";

// --- Enums / Literal Unions ---
export type ReviewState = "draft" | "approved" | "superseded";
export type VersionEntityType = "character" | "shot";
export type WorkflowStage =
  | "plan"
  | "plan_approval"
  | "render"
  | "render_approval"
  | "compose"
  | "review";
export type ConfigValue = string | number | boolean | null;

export type WsEventType =
  | "connected"
  | "pong"
  | "echo"
  | "error"
  | "run_started"
  | "run_progress"
  | "run_message"
  | "agent_thinking"
  | "run_completed"
  | "run_failed"
  | "run_awaiting_confirm"
  | "run_confirmed"
  | "run_cancelled"
  | "character_created"
  | "character_updated"
  | "character_deleted"
  | "shot_created"
  | "shot_updated"
  | "shot_deleted"
  | "outline_updated"
  | "project_updated"
  | "data_cleared"
  | "critique_result"
  | "bible_updated"
  | "version_created"
  | "version_rollback"
  | "audio_generated"
  | "export_completed"
  | "consistency_eval_completed";

// --- Agent Name Map ---
export const AGENT_NAME_MAP: Record<string, string> = {
  outline: "大纲",
  plan: "规划",
  character: "角色",
  shot: "分镜",
  compose: "合成",
  review: "审查",
  critic: "质量审查",
};

// --- Provider Settings ---
export interface ProjectProviderEntry {
  selected_key: string;
  source: "project" | "default";
  resolved_key: string;
  valid: boolean;
  status: string;
  reason_code?: string;
  reason_message?: string;
  capabilities?: {
    generate?: boolean;
    stream?: boolean;
  };
}

export interface ProjectProviderSettings {
  text: ProjectProviderEntry;
  image: ProjectProviderEntry;
  video: ProjectProviderEntry;
}

export interface ProjectProviderOverridesPayload {
  text_provider_override?: string | null;
  image_provider_override?: string | null;
  video_provider_override?: string | null;
}

// --- Project ---
export interface CreateProjectPayload extends ProjectProviderOverridesPayload {
  title: string;
  story?: string;
  style?: string;
  target_shot_count?: number;
  character_hints?: string[];
  creation_mode?: string;
  reference_images?: string[];
  universe_id?: number;
  chapter_number?: number;
  chapter_title?: string;
}

export interface UpdateProjectPayload
  extends Partial<CreateProjectPayload> {}

export interface Project {
  id: number;
  title: string;
  story?: string;
  style?: string;
  summary?: string;
  story_outline?: StoryOutline | null;
  visual_bible?: string | null;
  outline_approved?: boolean;
  video_url?: string | null;
  status?: string | null;
  target_shot_count?: number;
  character_hints?: string[] | null;
  creation_mode?: string | null;
  reference_images?: string[] | null;
  exports?: string[] | null;
  created_at: string;
  updated_at: string;
  provider_settings?: ProjectProviderSettings | null;
  universe_id?: number | null;
  chapter_number?: number | null;
  chapter_title?: string | null;
}

export interface BlockingClip {
  shot_id: number;
  order: number;
  status: string;
  reason: string;
}

export interface ProjectUpdatedPayload {
  title?: string;
  story?: string;
  style?: string;
  summary?: string;
  story_outline?: StoryOutline | null;
  visual_bible?: string | null;
  outline_approved?: boolean;
  video_url?: string | null;
  status?: string;
  target_shot_count?: number;
  character_hints?: string[] | null;
  creation_mode?: string;
  reference_images?: unknown;
  exports?: unknown;
  provider_settings?: ProjectProviderSettings | null;
  universe_id?: number | null;
  chapter_number?: number | null;
  chapter_title?: string | null;
  blocking_clips?: BlockingClip[] | null;
}

// --- Story Outline ---
export interface StoryOutlineAct {
  act: number;
  title: string;
  summary: string;
}

export interface StoryOutline {
  logline?: string;
  genre: string[];
  themes: string[];
  setting?: string;
  tone?: string;
  acts: StoryOutlineAct[];
  emotional_arc?: string;
}

export interface StoryOutlineUpdatePayload {
  logline?: string | null;
  genre?: string[] | null;
  themes?: string[] | null;
  setting?: string | null;
  tone?: string | null;
  acts?: StoryOutlineAct[] | null;
  emotional_arc?: string | null;
  visual_bible?: string | null;
  summary?: string | null;
  outline_approved?: boolean | null;
}

// --- Character ---
export interface Character {
  id: number;
  project_id: number;
  name: string;
  description?: string;
  image_url?: string | null;
  reference_images?: string[] | null;
  has_embedding?: boolean;
  visual_notes?: string | null;
  approval_state?: ReviewState;
  approval_version?: number;
  approved_at?: string | null;
  approved_name?: string | null;
  approved_description?: string | null;
  approved_image_url?: string | null;
}

export interface CharacterUpdatePayload {
  name?: string;
  description?: string;
  image_url?: string | null;
  visual_notes?: string | null;
  reference_images?: string[] | null;
}

export interface CharacterBible {
  id: number;
  visual_notes?: string | null;
  reference_images?: string[] | null;
  has_embedding?: boolean;
}

// --- Shot ---
export interface Shot {
  id: number;
  project_id: number;
  order: number;
  description?: string;
  prompt?: string;
  image_prompt?: string;
  image_url?: string | null;
  video_url?: string | null;
  duration?: number;
  camera?: string;
  motion_note?: string;
  scene?: string;
  action?: string;
  expression?: string;
  lighting?: string;
  dialogue?: string | null;
  sfx?: string;
  tts_url?: string | null;
  bgm_type?: string;
  seed?: number;
  character_ids?: number[];
  approval_state?: ReviewState;
  approval_version?: number;
  approved_at?: string | null;
  approved_description?: string | null;
  approved_prompt?: string | null;
  approved_image_prompt?: string | null;
  approved_duration?: number | null;
  approved_camera?: string | null;
  approved_motion_note?: string | null;
  approved_scene?: string | null;
  approved_action?: string | null;
  approved_expression?: string | null;
  approved_lighting?: string | null;
  approved_dialogue?: string | null;
  approved_sfx?: string | null;
  approved_character_ids?: number[] | null;
}

export interface ShotUpdatePayload {
  order?: number;
  description?: string;
  prompt?: string;
  image_prompt?: string;
  duration?: number;
  camera?: string;
  motion_note?: string;
  scene?: string;
  action?: string;
  expression?: string;
  lighting?: string;
  dialogue?: string | null;
  sfx?: string;
  seed?: number;
  character_ids?: number[];
}

// --- Versioning ---
export interface ArtifactVersion {
  id: number;
  entity_type: VersionEntityType;
  entity_id: number;
  version: number;
  snapshot: Record<string, unknown>;
  trigger: string;
  created_at: string;
}

export interface VersionListRead {
  entity_type: VersionEntityType;
  entity_id: number;
  versions: ArtifactVersion[];
}

export interface VersionDiff {
  field_name: string;
  old_value: unknown;
  new_value: unknown;
}

export interface VersionCompareRead {
  entity_type: VersionEntityType;
  entity_id: number;
  from_version: number;
  to_version: number;
  diffs: VersionDiff[];
}

export interface RollbackRequest {
  entity_type: VersionEntityType;
  entity_id: number;
  target_version: number;
}

export interface RollbackResponse {
  success: boolean;
  message: string;
  new_version: ArtifactVersion | null;
}

// --- Agent Run & Recovery ---
export interface AgentRun {
  id: number;
  project_id: number;
  status: string;
  current_agent?: string;
  progress?: number;
  error?: string | null;
  thread_id?: string;
  resource_type?: string;
  resource_id?: number;
  provider_snapshot?: ProjectProviderSettings | null;
  created_at: string;
  updated_at: string;
}

export interface RecoveryStageRead {
  name: string;
  status: "completed" | "current" | "pending" | "blocked";
  artifact_count: number;
}

export interface RecoverySummaryRead {
  project_id: number;
  run_id: number;
  thread_id: string;
  current_stage: string;
  next_stage: string;
  preserved_stages: string[];
  stage_history: RecoveryStageRead[];
  resumable: boolean;
}

export interface RecoveryControlRead {
  state: "active" | "recoverable";
  detail: string;
  available_actions: string[];
  thread_id?: string;
  active_run?: AgentRun | null;
  recovery_summary?: RecoverySummaryRead | null;
}

// --- WebSocket Event Data Types ---
export interface RunProgressEventData {
  run_id: number;
  project_id?: number;
  current_agent?: string;
  current_stage?: string;
  stage?: string;
  next_stage?: string;
  progress?: number;
  recovery_summary?: RecoverySummaryRead;
}

export interface RunAwaitingConfirmEventData {
  run_id: number;
  project_id?: number;
  agent: string;
  gate?: string;
  current_stage?: string;
  stage?: string;
  next_stage?: string;
  recovery_summary?: RecoverySummaryRead;
  preserved_stages?: string[];
  message?: string;
  completed?: boolean;
  next_step?: string;
  question?: string;
  auto_mode?: boolean;
  story_outline?: StoryOutline;
  visual_bible?: string;
}

export interface RunStartedEventData {
  run_id: number;
  project_id?: number;
  provider_snapshot?: ProjectProviderSettings;
  current_stage?: string;
  stage?: string;
  next_stage?: string;
  progress?: number;
  current_agent?: string;
  recovery_summary?: RecoverySummaryRead;
  preserved_stages?: string[];
}

export interface RunCompletedEventData {
  run_id?: number;
  project_id?: number;
  current_stage?: string;
  current_agent?: string;
  message?: string;
  video_generation_pending?: boolean;
}

export interface RunFailedEventData {
  run_id?: number;
  project_id?: number;
  error?: string;
  agent?: string;
  current_stage?: string;
}

export interface RunCancelledEventData {
  run_id?: number;
  project_id?: number;
  run_ids?: number[];
  cancelled_count?: number;
}

export interface RunConfirmedEventData {
  run_id: number;
  project_id?: number;
  agent: string;
  gate?: string;
  current_stage?: string;
  stage?: string;
  next_stage?: string;
  recovery_summary?: RecoverySummaryRead;
  auto_mode?: boolean;
}

export interface VersionCreatedEventData {
  entity_type: VersionEntityType;
  entity_id: number;
  version: number;
  trigger: string;
}

export interface VersionRollbackEventData {
  entity_type: VersionEntityType;
  entity_id: number;
  from_version: number;
  to_version: number;
}

export interface OutlineUpdatedEventData {
  project_id: number;
  story_outline: StoryOutline;
  visual_bible?: string;
  outline_approved?: boolean;
}

export interface CritiqueResultEventData {
  score: number;
  dimensions: Record<string, number>;
  issues: string[];
  suggestions: string[];
  entity_type: string;
  entity_id: number;
  will_regenerate: boolean;
}

export interface BibleUpdatedEventData {
  character_id: number;
  visual_notes?: string;
  reference_images_count: number;
  has_embedding: boolean;
}

export interface AudioGeneratedEventData {
  shot_id: number;
  tts_url?: string;
  bgm_type?: string;
  duration?: number;
}

export interface ExportResponse {
  export_id: string;
  project_id: number;
  format: string;
  status: string;
  download_url?: string;
  created_at: string;
}

export interface ExportCompletedEventData {
  export_id: string;
  format: string;
  download_url?: string;
  status: string;
  error?: string;
}

export interface AgentThinkingEventData {
  agent: string;
  phase: "reasoning" | "decision" | "planning" | "reviewing";
  content: string;
  details?: string;
}

export interface ConsistencyEvalCompletedEventData {
  project_id: number;
  overall_score: number;
  character_count: number;
}

// --- Messages ---
export interface AgentMessage {
  id?: string;
  agent: string;
  role: string;
  content: string;
  summary?: string;
  icon?: React.ComponentType<{ className?: string }>;
  timestamp?: string;
  progress?: number;
  isLoading?: boolean;
  phase?: "reasoning" | "decision" | "planning" | "reviewing";
  details?: string;
}

export interface Message {
  id: number;
  project_id: number;
  run_id?: number | null;
  agent: string;
  role: string;
  content: string;
  summary?: string | null;
  progress?: number | null;
  is_loading?: boolean;
  created_at: string;
}

// --- Configuration ---
export interface ConfigItem {
  key: string;
  value: ConfigValue;
  is_sensitive: boolean;
  is_masked: boolean;
  source: "db" | "env" | "default";
}

export interface ConfigSection {
  key: string;
  title: string;
  items: ConfigItem[];
}

export type AppConfig = ConfigItem[];

// --- Asset Management ---
export interface Asset {
  id: number;
  name: string;
  asset_type: "character" | "scene";
  description?: string;
  image_url?: string;
  metadata_json?: Record<string, unknown>;
  source_project_id?: number;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export interface AssetList {
  items: Asset[];
  total: number;
}

export interface AssetCreatePayload {
  name: string;
  asset_type: "character" | "scene";
  description?: string;
  image_url?: string;
  metadata_json?: Record<string, unknown>;
  source_project_id?: number;
  tags?: string[];
}

// --- Style Templates ---
export interface StyleTemplate {
  id: number;
  name: string;
  slug: string;
  category: "builtin" | "custom";
  description?: string;
  style_prompt: string;
  color_palette: string[];
  negative_prompt?: string;
  preview_image_url?: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StyleTemplateList {
  items: StyleTemplate[];
  total: number;
}

export interface StyleTemplateCreatePayload {
  name: string;
  slug: string;
  description?: string;
  style_prompt: string;
  color_palette?: string[];
  negative_prompt?: string;
  preview_image_url?: string;
}

export interface StyleTemplateUpdatePayload {
  name?: string;
  description?: string;
  style_prompt?: string;
  color_palette?: string[];
  negative_prompt?: string;
  preview_image_url?: string;
}

// --- Consistency Evaluation ---
export interface FaceMatchDetailRead {
  shot_id: number;
  shot_order: number;
  similarity: number;
  detected: boolean;
}

export interface CharacterConsistencyRead {
  character_id: number;
  character_name: string;
  face_similarity_mean: number;
  face_similarity_std: number;
  presence_rate: number;
  overall_score: number;
  face_matches: FaceMatchDetailRead[];
  grade: "A" | "B" | "C" | "D" | "F";
}

export interface ProjectConsistencyRead {
  project_id: number;
  overall_score: number;
  character_reports: CharacterConsistencyRead[];
  evaluated_at: string;
  eval_id?: string;
}

export interface ConsistencyEvalResponse {
  eval_id: string;
  status: string;
}

export interface ConsistencyReportRead {
  id: number;
  project_id: number;
  overall_score: number;
  created_at: string;
  report_data: ProjectConsistencyRead | null;
}

// --- Universe / IP ---
export interface Universe {
  id: number;
  name: string;
  description?: string;
  world_setting?: string;
  style_rules?: string;
  cover_image_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  projects_count: number;
  shared_characters_count: number;
}

export interface UniverseDetail extends Universe {
  chapters: UniverseProjectLinkRead[];
  shared_characters: SharedCharacterRead[];
}

export interface UniverseProjectLinkRead {
  id: number;
  universe_id: number;
  project_id: number;
  chapter_number?: number;
  chapter_title?: string;
  is_main_story: boolean;
  created_at: string;
  project_title?: string;
}

export interface SharedCharacterRead {
  id: number;
  universe_id: number;
  name: string;
  description?: string;
  visual_notes?: string;
  canonical_image_url?: string;
  reference_images?: string[];
  has_embedding: boolean;
  character_tags?: string;
  source_project_id?: number;
  source_character_id?: number;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  reference_images_count: number;
}

// --- WebSocket Event Envelope ---
export interface WsEvent {
  type: WsEventType;
  data: Record<string, unknown>;
}
