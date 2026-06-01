export const PHASE2_STAGES = [
  "plan_outline",
  "outline_approval",
  "plan_characters",
  "characters_approval",
  "plan_shots",
  "shots_approval",
  "render_characters",
  "critique_character_images",
  "character_images_approval",
  "render_shot_images",
  "render_shots",
  "critique_shot_images",
  "shot_images_approval",
  "compose_videos",
  "compose_approval",
  "review",
] as const;

export type Phase2Stage = (typeof PHASE2_STAGES)[number];

export const STAGE_ORDER: Record<Phase2Stage, number> = {
  plan_outline: 0,
  outline_approval: 1,
  plan_characters: 2,
  characters_approval: 3,
  plan_shots: 4,
  shots_approval: 5,
  render_characters: 6,
  critique_character_images: 7,
  character_images_approval: 8,
  render_shot_images: 9,
  render_shots: 10,
  critique_shot_images: 11,
  shot_images_approval: 12,
  compose_videos: 13,
  compose_approval: 14,
  review: 15,
};

export function nextStage(current: Phase2Stage): Phase2Stage | null {
  const currentOrder = STAGE_ORDER[current];
  const entries = Object.entries(STAGE_ORDER) as [Phase2Stage, number][];
  const next = entries.find(([, order]) => order === currentOrder + 1);
  return next ? next[0] : null;
}
