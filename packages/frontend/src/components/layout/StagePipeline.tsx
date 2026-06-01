"use client";

import { cn } from "@/lib/utils";
import { STAGE_PIPELINE, getPipelineStageIndex } from "@/utils/workflowStage";
import type { WorkflowStage } from "@/types";

interface StagePipelineProps {
  currentStage: WorkflowStage;
  isGenerating: boolean;
  awaitingConfirm: boolean;
  hasRecovery: boolean;
  onResume: () => void;
  onCancel: () => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  bulb: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  sparkle: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  film: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
    </svg>
  ),
  user: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  palette: (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  ),
};

export function StagePipeline({
  currentStage,
  isGenerating,
  awaitingConfirm,
  hasRecovery,
  onResume,
  onCancel,
}: StagePipelineProps) {
  const currentIndex = getPipelineStageIndex(currentStage);

  return (
    <div className="flex-shrink-0 flex items-center h-8 bg-base-100 border-b-2 border-base-300 z-20 px-2">
      <div className="flex items-center gap-0 flex-1">
        {STAGE_PIPELINE.map((stage, index) => {
          const isPast = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFuture = index > currentIndex;
          const isGeneratingHere = isCurrent && isGenerating && !awaitingConfirm;
          const isAwaitingHere = isCurrent && awaitingConfirm;

          let dotColor = "bg-base-300";
          if (isPast) dotColor = "bg-success";
          if (isCurrent && !isGeneratingHere && !isAwaitingHere) dotColor = "bg-primary";
          if (isGeneratingHere) dotColor = "bg-warning animate-pulse";
          if (isAwaitingHere) dotColor = "bg-info";

          return (
            <div key={stage.key} className="flex items-center gap-0">
              {/* Connector line before (except first) */}
              {index > 0 && (
                <div
                  className={cn(
                    "w-3 h-0.5 mx-0.5",
                    isPast ? "bg-success" : "bg-base-300",
                  )}
                />
              )}

              {/* Stage dot + label */}
              <button
                className={cn(
                  "flex items-center gap-1 px-1 py-0.5 rounded text-xs transition-colors",
                  isFuture && "opacity-50",
                )}
                title={stage.label}
              >
                <span
                  className={cn(
                    "inline-flex items-center justify-center w-4 h-4 rounded-full flex-shrink-0",
                    dotColor,
                  )}
                >
                  {(isPast || (isCurrent && !isGeneratingHere)) && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3 w-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {isGeneratingHere && ICON_MAP[stage.icon]}
                </span>
                <span className="hidden sm:inline">{stage.label}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Recovery / Cancel buttons */}
      {hasRecovery && !isGenerating && (
        <div className="flex items-center gap-1 ml-2">
          <button onClick={onResume} className="btn btn-xs btn-primary">
            恢复
          </button>
          <button onClick={onCancel} className="btn btn-xs btn-ghost">
            停止
          </button>
        </div>
      )}
    </div>
  );
}
