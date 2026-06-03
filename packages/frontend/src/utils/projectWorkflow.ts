import type { ComponentType } from "react";
import type { Character, RevisionEntityType, RevisionFeedbackType, Shot, WorkflowStage } from "@/types";

export type WorkflowStatus = "pending" | "active" | "review" | "done" | "error";

export interface WorkflowNode {
  id: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  status: WorkflowStatus;
  metric: string;
}

export function buildMaterialStages({
  currentStage,
  isGenerating,
  awaitingConfirm,
  awaitingAgent,
  outline,
  outlineApproved,
  characters,
  shots,
  projectVideoUrl,
  latestRunError,
}: {
  currentStage: string;
  isGenerating: boolean;
  awaitingConfirm: boolean;
  awaitingAgent: string | null;
  outline: Record<string, unknown> | null;
  outlineApproved: boolean;
  characters: Character[];
  shots: Shot[];
  projectVideoUrl: string | null;
  latestRunError: string | null;
}): Array<{ key: string; label: string; metric: string; status: WorkflowStatus }> {
  const hasOutline = !!outline && Object.keys(outline).length > 0;
  const characterImageCount = characters.filter((c) => !!c.image_url).length;
  const allCharacterImages = characters.length > 0 && characterImageCount === characters.length;
  const partialCharacters = characters.length > 0 && characterImageCount < characters.length;
  const playableVideoCount = shots.filter((s) => isPlayableVideoUrl(s.video_url)).length;
  const allShotVideos = shots.length > 0 && playableVideoCount === shots.length;
  const hasError = !!latestRunError && !isGenerating;

  return [
    {
      key: "outline",
      label: "故事大纲",
      metric: hasOutline ? (outlineApproved ? "已确认" : "待确认") : "待生成",
      status: hasOutline ? (!outlineApproved || awaitingAgent === "outline" && awaitingConfirm ? "review" : "done") : currentStage === "outline" && isGenerating ? "active" : "pending",
    },
    {
      key: "characters",
      label: "角色设定",
      metric: characters.length ? `${characterImageCount}/${characters.length} 图` : "待生成",
      status: allCharacterImages ? "done" : partialCharacters && !isGenerating ? "error" : characters.length > 0 && hasError ? "error" : currentStage === "characters" && isGenerating || currentStage === "characters_approval" ? "active" : hasOutline && outlineApproved && isGenerating ? "active" : "pending",
    },
    {
      key: "shots",
      label: "分镜脚本",
      metric: shots.length ? `${shots.length} 镜` : "待生成",
      status: shots.length > 0 ? (awaitingAgent === "shots" && awaitingConfirm ? "review" : "done") : currentStage === "shots" && isGenerating || currentStage === "shots_approval" && isGenerating ? "active" : "pending",
    },
    {
      key: "shotImages",
      label: "镜头画面",
      metric: `${playableVideoCount}/${shots.length || 0} 视频`,
      status: allShotVideos ? "done" : shots.length > 0 && hasError ? "error" : currentStage === "shot_images" && isGenerating || playableVideoCount > 0 ? "active" : "pending",
    },
    {
      key: "output",
      label: "合成输出",
      metric: isFinalVideoUrl(projectVideoUrl) ? "可导出" : allShotVideos ? "待合成" : "待生成",
      status: isFinalVideoUrl(projectVideoUrl) ? "done" : currentStage === "output" && isGenerating ? "active" : projectVideoUrl && isInternalCompositionUrl(projectVideoUrl) ? "error" : allShotVideos ? "active" : "pending",
    },
  ];
}

export function isPlayableVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov)(\?|#|$)/i.test(url) || url.includes(".oss-") && url.includes(".mp4");
}

export function isTaskVideoUrl(url?: string | null): boolean {
  return !!url && /\/tasks\/[^/?#]+/i.test(url);
}

export function isInternalCompositionUrl(url?: string | null): boolean {
  return !!url && (url.startsWith("miraframe:composition:") || url.startsWith("openoii:composition:"));
}

export function isFinalVideoUrl(url?: string | null): boolean {
  return isPlayableVideoUrl(url);
}

export function playableOrPreviewUrl(shot: Shot): string | null {
  return isPlayableVideoUrl(shot.video_url) ? shot.video_url! : shot.image_url || null;
}

export function videoIssue(shot: Shot): string | null {
  if (isPlayableVideoUrl(shot.video_url)) return null;
  if (isTaskVideoUrl(shot.video_url)) return "视频任务未返回可播放文件";
  if (shot.image_url) return "等待镜头视频";
  return "等待分镜帧";
}

export function formatRunError(error: string | null): string {
  if (!error) return "生成服务暂时没有返回明确错误。";
  if (error.includes("AllocationQuota.FreeTierOnly")) return "视频模型免费额度已耗尽，需要在模型服务侧关闭“仅使用免费额度”或更换/充值额度后重试。";
  if (error.includes("429") || error.includes("RateQuota")) return "外部生成服务触发限流，请稍后重试。";
  if (error.includes("did not finish")) return "视频任务生成时间过长，本次轮询超时；可以稍后重试未完成镜头。";
  return error;
}

export function stageForRevision(entityType?: RevisionEntityType): WorkflowStage {
  if (entityType === "outline") return "outline";
  if (entityType === "character" || entityType === "characters") return "characters";
  if (entityType === "shots") return "shots";
  if (entityType === "shot") return "shot_images";
  if (entityType === "project_video") return "output";
  return "review";
}

export function isEditableWorkflowNode(nodeId: string): boolean {
  return nodeId === "outline" || nodeId === "characters" || nodeId === "shots";
}

export function revisionTargetForNode(nodeId: string): {
  entityType: RevisionEntityType;
  feedbackType: RevisionFeedbackType;
  helper: string;
  placeholder: string;
} {
  if (nodeId === "outline") {
    return {
      entityType: "outline",
      feedbackType: "rewrite",
      helper: "会按你的反馈重新生成故事大纲，并保留为一次修改记录。",
      placeholder: "例如：加强反派动机，第二幕冲突更快爆发，整体更悬疑。",
    };
  }
  if (nodeId === "characters") {
    return {
      entityType: "characters",
      feedbackType: "rewrite",
      helper: "会重新执行角色设定节点，尽量保持故事大纲连续。",
      placeholder: "例如：女主更冷感，男主减少喜剧感，服装更利落。",
    };
  }
  if (nodeId === "shots") {
    return {
      entityType: "shots",
      feedbackType: "script",
      helper: "会重新执行分镜脚本节点，用于调整镜头数量、对白和节奏。",
      placeholder: "例如：减少铺垫镜头，第三幕增加一个近景反应镜头。",
    };
  }
  return {
    entityType: "outline",
    feedbackType: "rewrite",
    helper: "请选择故事大纲、角色设定或分镜脚本节点提交修改。",
    placeholder: "请选择可修改节点。",
  };
}

export function nodeIdForStage(stage: string): string {
  if (stage === "outline" || stage === "outline_approval") return "outline";
  if (stage === "characters" || stage === "characters_approval") return "characters";
  if (stage === "shots" || stage === "shots_approval") return "shots";
  if (stage === "shot_images") return "shotImages";
  if (stage === "output") return "output";
  return "outline";
}

export function getOutlineLogline(outline: Record<string, unknown> | null): string | null {
  if (!outline) return null;
  return textOf(outline.logline) || textOf(outline.summary) || textOf(outline.description);
}

export function getOutlineActs(outline: Record<string, unknown> | null): string[] {
  if (!outline) return [];
  const acts = Array.isArray(outline.acts) ? outline.acts : Array.isArray(outline.beats) ? outline.beats : [];
  return acts.map(formatOutlineItem).filter(Boolean);
}

export function textOf(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function formatOutlineItem(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  const title = textOf(record.title);
  const summary = textOf(record.summary || record.description);
  const act = record.act || record.order || record.index;
  return [act ? `第${act}幕` : null, title, summary].filter(Boolean).join("：");
}
