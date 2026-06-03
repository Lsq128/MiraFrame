"use client";

import { useEffect, useRef } from "react";
import { useRunStore } from "@/stores/runStore";
import { useMessageStore } from "@/stores/messageStore";
import { MessageList } from "./MessageList";
import { getWorkflowStageInfo } from "@/utils/workflowStage";

interface ChatPanelProps {
  onCancel: () => void;
  isGenerating: boolean;
}

export function ChatPanel({
  onCancel,
  isGenerating,
}: ChatPanelProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Store reads
  const messages = useMessageStore((s) => s.messages);
  const currentAgent = useRunStore((s) => s.currentAgent);
  const awaitingConfirm = useRunStore((s) => s.awaitingConfirm);
  const currentStage = useRunStore((s) => s.currentStage);

  // Derived
  const info = getWorkflowStageInfo(currentStage);
  const hasMessages = messages.length > 0;
  const agentDisplayName = currentAgent || "AI";

  // Auto-scroll
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-base-100">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-base-200">
        {info && (
          <>
            <span className="text-lg">{info.icon === "film" ? "🎬" : info.icon === "palette" ? "🎨" : "💡"}</span>
            <span className="text-sm font-medium flex-1">{info.label}</span>
          </>
        )}
      </div>

      {/* Generating indicator */}
      {isGenerating && !awaitingConfirm && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-warning/10 border-b border-warning/20 text-xs">
          <span className="loading loading-dots loading-xs text-warning" />
          <span className="flex-1">{agentDisplayName}</span>
          <span className="badge badge-xs badge-warning">AUTO</span>
          <button onClick={onCancel} className="btn btn-xs btn-ghost text-error">
            停止
          </button>
        </div>
      )}

      {/* Scrollable messages area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto halftone-bg"
      >
        {!hasMessages && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
            <span className="text-4xl">
              {info?.icon === "film" ? "🎬" : info?.icon === "palette" ? "🎨" : "💡"}
            </span>
            <p className="text-sm text-muted-foreground">
              {info?.description || "准备开始生成"}
            </p>
          </div>
        )}

        <MessageList messages={messages} />
      </div>
    </div>
  );
}
