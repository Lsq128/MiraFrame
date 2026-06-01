"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, FileText, RotateCcw } from "lucide-react";
import type { StoryOutline } from "@/types";
import { cn } from "@/lib/utils";

interface OutlinePreviewCardProps {
  outline: StoryOutline;
  visualBible?: string | null;
  onConfirm: () => void;
  onRegenerate: (feedback: string) => void;
}

export function OutlinePreviewCard({
  outline,
  visualBible,
  onConfirm,
  onRegenerate,
}: OutlinePreviewCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState(() => JSON.stringify(outline, null, 2));
  const [feedback, setFeedback] = useState("");

  const handleRegenerate = () => {
    let combined = feedback;
    try {
      const edited = JSON.parse(draft);
      combined += `\n\n大纲编辑:\n${JSON.stringify(edited, null, 2)}`;
    } catch {
      // Use feedback alone
    }
    onRegenerate(combined);
  };

  return (
    <div className="rounded-lg border border-primary/25 bg-base-100 overflow-hidden">
      <div className="bg-primary/5 border-b border-primary/20 px-3 py-3">
        <div className="flex items-start gap-2">
          <span className="h-8 w-8 rounded-md bg-base-100 text-primary flex items-center justify-center shrink-0">
            <FileText className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <span className="text-xs text-primary font-medium">故事大纲节点</span>
            <h3 className="text-sm font-bold mt-0.5">项目规划已完成，等待确认</h3>
          </div>
          <span className="badge badge-sm badge-info">待确认</span>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {outline.logline && (
          <p className="text-sm leading-6">{outline.logline}</p>
        )}

        {/* Genres */}
        {outline.genre?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {outline.genre.map((g, i) => (
              <span key={i} className="badge badge-sm badge-outline">
                {g}
              </span>
            ))}
          </div>
        )}

        {/* Acts */}
        <div className="space-y-2">
          {outline.acts?.map((act) => (
            <div key={act.act} className="rounded-md border border-base-200 p-2 text-xs">
              <span className="font-bold">第{act.act}幕 {act.title}</span>
              <p className="text-muted-foreground mt-1 leading-5">{act.summary}</p>
            </div>
          ))}
        </div>

        {/* Visual Bible preview */}
        {visualBible && (
          <div className="text-xs text-muted-foreground border-t border-base-200 pt-2 leading-5">
            <span className="font-medium">视觉风格: </span>
            {visualBible.length > 120 ? visualBible.slice(0, 120) + "..." : visualBible}
          </div>
        )}

        {/* Toggle expand */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
          {expanded ? "收起编辑" : "展开详细大纲"}
        </button>

        {/* Expanded editor */}
        {expanded && (
          <div className="space-y-2">
            <textarea
              className="textarea textarea-bordered w-full text-xs font-mono"
              rows={8}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
            <textarea
              className="textarea textarea-bordered w-full text-xs"
              rows={3}
              placeholder="输入重新生成的反馈意见..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button onClick={onConfirm} className="btn btn-primary btn-sm gap-1">
            <CheckCircle2 className="h-4 w-4" />
            确认并进入角色
          </button>
          <button onClick={handleRegenerate} className="btn btn-outline btn-sm gap-1">
            <RotateCcw className="h-4 w-4" />
            按反馈重生成
          </button>
        </div>
      </div>
    </div>
  );
}
