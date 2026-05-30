import { Annotation } from "@langchain/langgraph";
import type { Phase2Stage } from "@openoii/shared";

export const Phase2State = Annotation.Root({
  projectId: Annotation<string>(),
  runId: Annotation<string>(),
  threadId: Annotation<string>(),
  currentStage: Annotation<Phase2Stage>(),
  nextStage: Annotation<Phase2Stage | null>(),
  stageHistory: Annotation<string[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  approvalHistory: Annotation<Record<string, string>>(),
  critiqueScores: Annotation<Record<string, number>>(),
  critiqueRound: Annotation<number>(),
  artifactLineage: Annotation<Record<string, string[]>>(),
  routeStage: Annotation<string | null>(),
  routeMode: Annotation<"full" | "incremental">(),
  reviewRequested: Annotation<boolean>(),
});

export type Phase2StateType = typeof Phase2State.State;
