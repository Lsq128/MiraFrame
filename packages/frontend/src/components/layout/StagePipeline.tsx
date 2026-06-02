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
  stages?: Array<{
    key: string;
    label: string;
    metric: string;
    status: "pending" | "active" | "review" | "done" | "error";
  }>;
}

export function StagePipeline({
  currentStage,
  isGenerating,
  awaitingConfirm,
  hasRecovery,
  onResume,
  onCancel,
  stages,
}: StagePipelineProps) {
  const currentIndex = getPipelineStageIndex(currentStage);
  const compactStages = stages ?? STAGE_PIPELINE.map((stage, index) => {
    const isPast = index < currentIndex;
    const isCurrent = index === currentIndex;
    const isGeneratingHere = isCurrent && isGenerating && !awaitingConfirm;
    const isAwaitingHere = isCurrent && awaitingConfirm;

    return {
      key: stage.key,
      label: stage.label,
      metric: "",
      status: isPast ? "done" as const : isAwaitingHere ? "review" as const : isGeneratingHere ? "active" as const : isCurrent ? "done" as const : "pending" as const,
    };
  });

  return (
    <div className="flex-shrink-0 flex items-center min-h-11 bg-base-100 border-b border-base-300 z-20 px-3">
      <div className="flex items-center gap-y-1 flex-1 flex-wrap py-1">
        {compactStages.map((stage, index) => {
          const isFuture = stage.status === "pending";
          const dotColor = {
            pending: "bg-base-300",
            active: "bg-warning animate-pulse",
            review: "bg-info",
            done: "bg-success",
            error: "bg-error",
          }[stage.status];

          return (
            <div key={stage.key} className="flex items-center gap-0">
              {index > 0 && (
                <div
                  className={cn(
                    "w-4 h-0.5 mx-1 shrink-0",
                    compactStages[index - 1]?.status === "done" ? "bg-success" : "bg-base-300",
                  )}
                />
              )}

              <button
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs transition-colors whitespace-nowrap",
                  stage.status === "error" && "bg-error/5 text-error",
                  stage.status === "active" && "bg-warning/10",
                  stage.status === "review" && "bg-info/10",
                  isFuture && "opacity-50",
                )}
                title={stage.label}
              >
                <span
                  className={cn(
                    "inline-flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 text-white",
                    dotColor,
                  )}
                >
                  {stage.status === "done" && (
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
                  {stage.status === "active" && (
                    <span className="h-2 w-2 rounded-full bg-white" />
                  )}
                  {stage.status === "review" && (
                    <span className="h-2 w-2 rounded-full bg-white" />
                  )}
                  {stage.status === "error" && (
                    <span className="text-[10px] leading-none">!</span>
                  )}
                </span>
                <span className="font-medium">{stage.label}</span>
                {stage.metric && <span className="hidden sm:inline text-muted-foreground">{stage.metric}</span>}
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
