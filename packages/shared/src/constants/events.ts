export const WS_EVENT_TYPES = [
  "connected", "pong", "echo", "error",
  "run_started", "run_progress", "run_message", "agent_thinking",
  "run_completed", "run_failed", "run_awaiting_confirm", "run_confirmed", "run_cancelled",
  "character_created", "character_updated", "character_deleted",
  "shot_created", "shot_updated", "shot_deleted",
  "outline_updated", "project_updated", "data_cleared",
  "critique_result", "bible_updated",
  "version_created", "version_rollback",
  "audio_generated", "export_completed",
  "consistency_eval_completed",
] as const;

export type WsEventTypeValue = (typeof WS_EVENT_TYPES)[number];
