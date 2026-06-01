import type { WorkflowStage } from "@/types";

/** Backend stage names to frontend WorkflowStage mapping */
export function resolveEventStage(data: Record<string, unknown>): WorkflowStage | null {
  const stage = (data.stage as string) || (data.current_stage as string) || null;
  if (!stage) return null;

  const stageMap: Record<string, WorkflowStage> = {
    plan_outline: "plan",
    outline_approval: "plan_approval",
    plan_characters: "plan",
    characters_approval: "plan_approval",
    plan_shots: "plan",
    shots_approval: "plan_approval",
    render_characters: "render",
    critique_characters: "render",
    character_images_approval: "render_approval",
    render_shots: "render",
    critique_shots: "render",
    shot_images_approval: "render_approval",
    compose_videos: "compose",
    compose_approval: "compose",
    compose_merge: "compose",
    add_audio: "compose",
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
    plan: {
      key: "plan",
      label: "规划",
      icon: "bulb",
      description: "正在分析故事并规划角色与分镜",
    },
    plan_approval: {
      key: "plan_approval",
      label: "规划确认",
      icon: "user",
      description: "请审核角色设计和分镜脚本",
    },
    render: {
      key: "render",
      label: "渲染",
      icon: "palette",
      description: "正在生成角色图像和分镜画面",
    },
    render_approval: {
      key: "render_approval",
      label: "渲染确认",
      icon: "user",
      description: "请审核生成的图像",
    },
    compose: {
      key: "compose",
      label: "合成",
      icon: "film",
      description: "正在生成视频并合成最终成片",
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
  { key: "plan", icon: "bulb", label: "规划" },
  { key: "plan_approval", icon: "user", label: "确认" },
  { key: "render", icon: "palette", label: "渲染" },
  { key: "render_approval", icon: "user", label: "确认" },
  { key: "compose", icon: "film", label: "合成" },
  { key: "review", icon: "user", label: "审查" },
];

export function getPipelineStageIndex(current: WorkflowStage): number {
  return STAGE_PIPELINE.findIndex((s) => s.key === current);
}
