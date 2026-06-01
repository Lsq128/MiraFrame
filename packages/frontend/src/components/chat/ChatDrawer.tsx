"use client";

import { useEffect } from "react";
import { useChatPanelStore } from "@/stores/chatPanelStore";
import { useRunStore } from "@/stores/runStore";
import { ChatPanel } from "./ChatPanel";

interface ChatDrawerProps {
  onSendFeedback: (content: string) => void;
  onConfirm: (feedback?: string) => void;
  onGenerate: () => void;
  onCancel: () => void;
  isGenerating: boolean;
  generateDisabled?: boolean;
  generateDisabledReason?: string;
}

/**
 * ChatDrawer — conditional render when open, but auto-opens when generation starts
 * or when user clicks the toggle button in the pipeline area.
 *
 * WS events always reach stores via getState() regardless of whether ChatPanel is mounted.
 * When ChatPanel mounts, it subscribes to stores and renders existing data.
 */
export function ChatDrawer(props: ChatDrawerProps) {
  const { isOpen, close, open } = useChatPanelStore();
  const awaitingConfirm = useRunStore((s) => s.awaitingConfirm);
  const runMode = useRunStore((s) => s.runMode);
  const isGenerating = useRunStore((s) => s.isGenerating);

  // Auto-open when generation starts or when awaiting confirm in manual mode
  useEffect(() => {
    if ((isGenerating || awaitingConfirm) && runMode !== "yolo") {
      open();
    }
  }, [isGenerating, awaitingConfirm, runMode, open]);

  if (!isOpen) {
    // Render a minimized toggle tab
    return (
      <div className="flex flex-col w-8 bg-base-100 border-l border-base-300">
        <button
          onClick={open}
          className="flex-1 flex items-center justify-center hover:bg-base-200 transition-colors"
          title="打开对话面板"
        >
          <span className="text-xs [writing-mode:vertical-rl]">对话</span>
        </button>
        {awaitingConfirm && (
          <span className="w-2 h-2 rounded-full bg-warning animate-pulse mx-auto mb-1" />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-[360px] bg-base-100 border-l border-base-300">
      {/* Header */}
      <div className="flex justify-end px-2 py-1 border-b border-base-200">
        <button
          onClick={close}
          className="btn btn-xs btn-circle btn-ghost"
          aria-label="关闭对话面板"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        <ChatPanel {...props} />
      </div>
    </div>
  );
}
