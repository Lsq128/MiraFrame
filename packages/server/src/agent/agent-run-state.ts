import type { Phase2StateType } from "@miraframe/agent";
import type { GenerationInput } from "./agent.service";

export interface AgentProjectSnapshot {
  title: string | null;
  story: string | null;
  style: string | null;
  targetShotCount: number | null;
  storyOutline: Record<string, unknown> | null;
  visualBible: string | null;
}

export function buildProjectContext(
  projectId: number,
  project: AgentProjectSnapshot | undefined,
  input: GenerationInput,
): string {
  return [
    `Project title: ${project?.title || `Project ${projectId}`}`,
    `Visual style: ${project?.style || "anime"}`,
    `Target shot count: ${project?.targetShotCount || 4}`,
    project?.visualBible ? `Visual bible:\n${project.visualBible}` : null,
    project?.storyOutline ? `Approved outline JSON:\n${JSON.stringify(project.storyOutline)}` : null,
    input.feedback
      ? [
          "Current user revision request:",
          `Target entity: ${input.entityType || "project"}${input.entityId ? ` #${input.entityId}` : ""}`,
          `Feedback type: ${input.feedbackType || "general"}`,
          `Revision mode: ${input.revisionMode || "stage"}`,
          input.feedback,
        ].join("\n")
      : null,
    "Story brief:",
    project?.story || "No story brief provided.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildInitialState(input: GenerationInput): Phase2StateType {
  const initialStage = (input.targetStage as Phase2StateType["currentStage"] | undefined) || "plan_outline";

  return {
    projectId: String(input.projectId),
    runId: String(input.runId),
    threadId: input.threadId,
    currentStage: initialStage,
    nextStage: null,
    stageHistory: [],
    approvalHistory: buildInitialApprovalHistory(initialStage),
    critiqueScores: {},
    critiqueRound: 0,
    artifactLineage: {},
    routeStage: null,
    routeMode: input.mode,
    reviewRequested: false,
    feedback: input.feedback || null,
    feedbackType: input.feedbackType || null,
    entityType: input.entityType || null,
    entityId: input.entityId || null,
    revisionMode: input.revisionMode || null,
  };
}

function buildInitialApprovalHistory(stage: Phase2StateType["currentStage"]): Record<string, string> {
  const approvalHistory: Record<string, string> = {};
  if (
    stage === "plan_characters" ||
    stage === "plan_shots" ||
    stage === "render_shot_images" ||
    stage === "compose_videos"
  ) {
    approvalHistory.outline = "approved";
  }
  if (stage === "plan_shots" || stage === "render_shot_images" || stage === "compose_videos") {
    approvalHistory.characters = "approved";
  }
  if (stage === "render_shot_images" || stage === "compose_videos") {
    approvalHistory.shots = "approved";
  }
  return approvalHistory;
}
