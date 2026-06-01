import { create } from "zustand";
import type {
  RecoveryControlRead,
  RecoverySummaryRead,
  RunAwaitingConfirmEventData,
  ProjectProviderSettings,
  WorkflowStage,
} from "@/types";

export type RunMode = "manual" | "yolo";

interface RunState {
  // Run lifecycle
  isGenerating: boolean;
  currentStage: WorkflowStage;
  currentAgent: string | null;
  progress: number;
  currentRunId: number | null;
  currentRunProviderSnapshot: ProjectProviderSettings | null;

  // Recovery / gate
  recoveryControl: RecoveryControlRead | null;
  recoverySummary: RecoverySummaryRead | null;
  recoveryGate: RunAwaitingConfirmEventData | null;

  // Awaiting confirm
  awaitingConfirm: boolean;
  awaitingAgent: string | null;

  // User prefs
  runMode: RunMode;

  // Error
  error: string | null;

  // Actions — Run lifecycle
  setGenerating: (isGenerating: boolean) => void;
  setCurrentStage: (stage: WorkflowStage) => void;
  setCurrentAgent: (agent: string | null) => void;
  setProgress: (progress: number) => void;
  setCurrentRunId: (runId: number | null) => void;
  setCurrentRunProviderSnapshot: (snapshot: ProjectProviderSettings | null) => void;

  // Actions — Recovery
  setRecoveryControl: (control: RecoveryControlRead | null) => void;
  setRecoverySummary: (summary: RecoverySummaryRead | null) => void;
  setRecoveryGate: (gate: RunAwaitingConfirmEventData | null) => void;

  // Actions — Awaiting confirm
  setAwaitingConfirm: (awaiting: boolean, agent?: string | null, runId?: number | null) => void;

  // Actions — Run mode
  setRunMode: (mode: RunMode) => void;

  // Actions — Compound helpers
  startRun: (runId: number, mode?: RunMode) => void;
  completeRun: () => void;
  failRun: (error: string) => void;
  cancelRun: () => void;
  resetRunState: () => void;

  // Actions — Error
  setError: (error: string | null) => void;
}

export const useRunStore = create<RunState>((set) => ({
  isGenerating: false,
  currentStage: "plan",
  currentAgent: null,
  progress: 0,
  currentRunId: null,
  currentRunProviderSnapshot: null,

  recoveryControl: null,
  recoverySummary: null,
  recoveryGate: null,

  awaitingConfirm: false,
  awaitingAgent: null,

  runMode: "manual",
  error: null,

  setGenerating: (isGenerating) => set({ isGenerating }),
  setCurrentStage: (stage) => set({ currentStage: stage }),
  setCurrentAgent: (agent) => set({ currentAgent: agent }),
  setProgress: (progress) => set({ progress }),
  setCurrentRunId: (runId) => set({ currentRunId: runId }),
  setCurrentRunProviderSnapshot: (snapshot) => set({ currentRunProviderSnapshot: snapshot }),

  setRecoveryControl: (control) => set({ recoveryControl: control }),
  setRecoverySummary: (summary) => set({ recoverySummary: summary }),
  setRecoveryGate: (gate) => set({ recoveryGate: gate }),

  setAwaitingConfirm: (awaiting, agent = null, runId) =>
    set((state) => ({
      awaitingConfirm: awaiting,
      awaitingAgent: agent,
      currentRunId: runId !== undefined ? runId : state.currentRunId,
    })),

  setRunMode: (mode) => set({ runMode: mode }),
  setError: (error) => set({ error }),

  startRun: (runId, mode = "manual") =>
    set({
      isGenerating: true,
      currentRunId: runId,
      runMode: mode,
      progress: 0,
      error: null,
      awaitingConfirm: false,
      awaitingAgent: null,
      recoveryControl: null,
      recoverySummary: null,
      recoveryGate: null,
    }),

  completeRun: () =>
    set({
      isGenerating: false,
      progress: 1,
      awaitingConfirm: false,
      awaitingAgent: null,
    }),

  failRun: (error) =>
    set({
      isGenerating: false,
      error,
      awaitingConfirm: false,
      awaitingAgent: null,
    }),

  cancelRun: () =>
    set({
      isGenerating: false,
      awaitingConfirm: false,
      awaitingAgent: null,
    }),

  resetRunState: () =>
    set({
      isGenerating: false,
      currentAgent: null,
      progress: 0,
      recoveryControl: null,
      recoverySummary: null,
      recoveryGate: null,
      awaitingConfirm: false,
      awaitingAgent: null,
      currentRunId: null,
      currentRunProviderSnapshot: null,
    }),
}));
