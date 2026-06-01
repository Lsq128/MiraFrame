"use client";

import { useState, useEffect, useRef } from "react";
import { CheckCircle2, RotateCcw, SendHorizontal, SlidersHorizontal, Zap } from "lucide-react";
import { useRunStore } from "@/stores/runStore";
import { useMessageStore } from "@/stores/messageStore";
import { useProjectStore } from "@/stores/projectStore";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { OutlinePreviewCard } from "./OutlinePreviewCard";
import { getWorkflowStageInfo } from "@/utils/workflowStage";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  onSendFeedback: (content: string) => void;
  onConfirm: (feedback?: string) => void;
  onGenerate: () => void;
  onCancel: () => void;
  isGenerating: boolean;
  generateDisabled?: boolean;
  generateDisabledReason?: string;
}

export function ChatPanel({
  onSendFeedback,
  onConfirm,
  onGenerate,
  onCancel,
  isGenerating,
  generateDisabled = false,
  generateDisabledReason,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Store reads
  const messages = useMessageStore((s) => s.messages);
  const currentAgent = useRunStore((s) => s.currentAgent);
  const awaitingConfirm = useRunStore((s) => s.awaitingConfirm);
  const awaitingAgent = useRunStore((s) => s.awaitingAgent);
  const currentStage = useRunStore((s) => s.currentStage);
  const currentRunId = useRunStore((s) => s.currentRunId);
  const runMode = useRunStore((s) => s.runMode);
  const recoveryGate = useRunStore((s) => s.recoveryGate);
  const setRunMode = useRunStore((s) => s.setRunMode);

  const storyOutline = useProjectStore((s) => s.projectStoryOutline);
  const visualBible = useProjectStore((s) => s.projectVisualBible);
  const outlineApproved = useProjectStore((s) => s.projectOutlineApproved);

  // Derived
  const info = getWorkflowStageInfo(currentStage);
  const hasMessages = messages.length > 0;
  const agentDisplayName = currentAgent || "AI";
  const isYolo = runMode === "yolo";
  const outlineForApproval = recoveryGate?.story_outline || (!outlineApproved ? storyOutline : null);
  const showOutlinePreview =
    (!!outlineForApproval && !outlineApproved) ||
    (awaitingConfirm && awaitingAgent === "outline" && !!recoveryGate?.story_outline);
  const showManualConfirm = awaitingConfirm && !showOutlinePreview && runMode !== "yolo";
  const awaitingLabel = awaitingAgent === "outline" || awaitingAgent === "outline"
    ? "项目规划已完成"
    : `${awaitingAgent || "AI"} 节点等待确认`;

  // Auto-scroll
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    if (currentRunId || isGenerating || awaitingConfirm) {
      onConfirm(input.trim());
    } else {
      onSendFeedback(input);
    }
    setInput("");
  };

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

        {/* YOLO / Manual toggle */}
        <button
          onClick={() => setRunMode(isYolo ? "manual" : "yolo")}
          className={cn(
            "btn btn-xs gap-1",
            isYolo ? "btn-warning" : "btn-ghost",
          )}
          title={isYolo ? "YOLO 模式：自动确认" : "手动模式：需人工确认"}
        >
          {isYolo ? (
            <Zap className="h-3 w-3" />
          ) : (
            <SlidersHorizontal className="h-3 w-3" />
          )}
          <span className="hidden sm:inline">{isYolo ? "YOLO" : "手动"}</span>
        </button>
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
            <button
              onClick={onGenerate}
              disabled={generateDisabled}
              className="btn btn-primary"
            >
              开始生成
            </button>
            {generateDisabled && generateDisabledReason && (
              <p className="text-xs text-warning">{generateDisabledReason}</p>
            )}
          </div>
        )}

        <MessageList messages={messages} />

        {/* Outline preview */}
        {showOutlinePreview && outlineForApproval && (
          <div className="px-3 pb-3">
            <OutlinePreviewCard
              outline={outlineForApproval}
              visualBible={visualBible}
              onConfirm={() => onConfirm()}
              onRegenerate={(feedback) => onConfirm(feedback)}
            />
          </div>
        )}
      </div>

      {/* Manual confirm bar */}
      {showManualConfirm && (
        <div className="border-t border-primary/20 bg-primary/5 p-3">
          <div className="rounded-lg border border-primary/25 bg-base-100 p-3">
            <div className="flex items-start gap-2">
              <span className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{awaitingLabel}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  确认后会进入下一个生成节点；也可以在输入框写反馈后发送重生成。
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button onClick={() => onConfirm()} className="btn btn-primary btn-sm gap-1">
                <SendHorizontal className="h-4 w-4" />
                进入下一步
              </button>
              <button
                onClick={() => input.trim() && handleSend()}
                disabled={!input.trim()}
                className="btn btn-outline btn-sm gap-1"
              >
                <RotateCcw className="h-4 w-4" />
                按反馈重生成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message input */}
      <MessageInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        placeholder={
          awaitingConfirm
            ? "输入反馈后发送确认..."
            : isGenerating
              ? "输入消息发送给 AI..."
              : "描述你的需求..."
        }
      />
    </div>
  );
}
