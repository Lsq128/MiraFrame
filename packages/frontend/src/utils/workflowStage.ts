import type { WorkflowStage } from "@/types";

/** Backend stage names to frontend WorkflowStage mapping */
export function resolveEventStage(data: Record<string, unknown>): WorkflowStage | null {
  const stage = (data.stage as string) || (data.current_stage as string) || null;
  if (!stage) return null;

  const stageMap: Record<string, WorkflowStage> = {
    plan_outline: "outline",
    outline_approval: "outline_approval",
    plan_characters: "characters",
    characters_approval: "characters_approval",
    plan_shots: "shots",
    shots_approval: "shots_approval",
    render_shot_images: "shot_images",
    compose_videos: "output",
    compose_approval: "output",
    review: "review",
  };

  return stageMap[stage] || null;
}

export interface StageInfo {
  key: WorkflowStage;
  label: string;
  icon: string;
  description: string;
}

export function getWorkflowStageInfo(stage: WorkflowStage): StageInfo {
  const stages: Record<WorkflowStage, StageInfo> = {
    outline: {
      key: "outline",
      label: "大纲",
      icon: "bulb",
      description: "正在分析故事并生成剧情大纲",
    },
    outline_approval: {
      key: "outline_approval",
      label: "大纲确认",
      icon: "user",
      description: "请审核故事大纲内容",
    },
    characters: {
      key: "characters",
      label: "角色设定",
      icon: "users",
      description: "正在分析角色并生成设定图",
    },
    characters_approval: {
      key: "characters_approval",
      label: "角色确认",
      icon: "user",
      description: "请审核角色设计与形象",
    },
    shots: {
      key: "shots",
      label: "分镜",
      icon: "film",
      description: "正在生成分镜脚本",
    },
    shots_approval: {
      key: "shots_approval",
      label: "分镜确认",
      icon: "user",
      description: "请审核分镜脚本内容",
    },
    shot_images: {
      key: "shot_images",
      label: "镜头画面",
      icon: "image",
      description: "正在生成分镜画面（预览）",
    },
    output: {
      key: "output",
      label: "合成输出",
      icon: "download",
      description: "正在合成最终漫剧视频",
    },
    review: {
      key: "review",
      label: "审查",
      icon: "user",
      description: "最终审查与反馈",
    },
  };
  return stages[stage];
}

/** Pipeline stages in display order */
export const STAGE_PIPELINE: Array<{
  key: WorkflowStage;
  icon: string;
  label: string;
}> = [
  { key: "outline", icon: "bulb", label: "大纲" },
  { key: "outline_approval", icon: "user", label: "确认" },
  { key: "characters", icon: "users", label: "角色设定" },
  { key: "characters_approval", icon: "user", label: "确认" },
  { key: "shots", icon: "film", label: "分镜" },
  { key: "shots_approval", icon: "user", label: "确认" },
  { key: "shot_images", icon: "image", label: "镜头画面" },
  { key: "output", icon: "download", label: "合成" },
  { key: "review", icon: "user", label: "审查" },
];

export function getPipelineStageIndex(current: WorkflowStage): number {
  return STAGE_PIPELINE.findIndex((s) => s.key === current);
}
