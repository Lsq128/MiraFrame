import { create } from "zustand";
import type { RecoverySummary } from "@openoii/shared";

export type RunMode = "manual" | "auto";

interface RunState {
  isGenerating: boolean;
  currentAgent: string | null;
  currentStage: string | null;
  progress: number;
  awaitingConfirm: boolean;
  currentRunId: string | null;
  runMode: RunMode;
  error: string | null;
  recoverySummary: RecoverySummary | null;

  startRun: (runId: string, mode: RunMode) => void;
  updateProgress: (agent: string | null, stage: string | null, progress: number) => void;
  setAwaitingConfirm: (awaiting: boolean) => void;
  completeRun: () => void;
  failRun: (error: string) => void;
  cancelRun: () => void;
  setRecoverySummary: (summary: RecoverySummary | null) => void;
}

export const useRunStore = create<RunState>((set) => ({
  isGenerating: false,
  currentAgent: null,
  currentStage: null,
  progress: 0,
  awaitingConfirm: false,
  currentRunId: null,
  runMode: "manual",
  error: null,
  recoverySummary: null,

  startRun: (runId, mode) =>
    set({
      isGenerating: true,
      currentRunId: runId,
      runMode: mode,
      progress: 0,
      error: null,
    }),
  updateProgress: (agent, stage, progress) =>
    set({ currentAgent: agent, currentStage: stage, progress }),
  setAwaitingConfirm: (awaiting) => set({ awaitingConfirm: awaiting }),
  completeRun: () =>
    set({ isGenerating: false, progress: 1, awaitingConfirm: false }),
  failRun: (error) =>
    set({ isGenerating: false, error, awaitingConfirm: false }),
  cancelRun: () => set({ isGenerating: false, awaitingConfirm: false }),
  setRecoverySummary: (summary) => set({ recoverySummary: summary }),
}));
