"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { CheckCircle2, Clapperboard, FileText, Sparkles, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AgentMessage } from "@/types";
import { AGENT_NAME_MAP } from "@/types";
import { cn } from "@/lib/utils";

interface MessageListProps {
  messages: AgentMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [completedTypewriters, setCompletedTypewriters] = useState<Set<string>>(new Set());
  const messageFirstSeenRef = useRef<Map<string, number>>(new Map());
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    sentinelRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Auto-collapse old messages when > 8
  useEffect(() => {
    if (messages.length <= 8) return;
    const toCollapse = new Set(collapsed);
    for (let i = 0; i < messages.length - 4; i++) {
      const msg = messages[i];
      if (msg.summary && msg.id && !collapsed.has(msg.id)) {
        toCollapse.add(msg.id);
      }
    }
    if (toCollapse.size !== collapsed.size) setCollapsed(toCollapse);
  }, [messages, collapsed]);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleTypewriterComplete = useCallback((id: string) => {
    setCompletedTypewriters((prev) => new Set(prev).add(id));
  }, []);

  const shouldFilterOut = useCallback((msg: AgentMessage): boolean => {
    if (msg.role === "info" && msg.agent === "system") return true;
    if (!msg.content && !msg.summary && !msg.isLoading) return false;
    return false;
  }, []);

  const filtered = messages.filter((m) => !shouldFilterOut(m));

  if (filtered.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        暂无消息
      </div>
    );
  }

  let prevAgent = "";

  return (
    <div className="space-y-3 px-3 py-2">
      {filtered.map((msg, idx) => {
        const isFirstFromAgent = msg.agent !== prevAgent;
        prevAgent = msg.agent;

        // Separator
        if (msg.role === "separator") {
          return (
            <div key={msg.id || idx} className="flex items-center gap-2">
              <div className="flex-1 border-t border-dashed border-base-300" />
              <span className="text-xs text-muted-foreground">{msg.content}</span>
              <div className="flex-1 border-t border-dashed border-base-300" />
            </div>
          );
        }

        // Thinking message
        if (msg.role === "thinking") {
          return <ThinkingBubble key={msg.id || idx} msg={msg} />;
        }

        // Handoff
        if (msg.role === "handoff") {
          return (
            <div key={msg.id || idx} className="flex justify-center">
              <span className="badge badge-sm gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
                {msg.content}
              </span>
            </div>
          );
        }

        const isCollapsed = msg.id && collapsed.has(msg.id);
        const structured = getStructuredMessage(msg);

        return (
          <div key={msg.id || idx} className="space-y-1">
            {/* Agent header */}
            {isFirstFromAgent && msg.role !== "error" && (
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground px-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {msg.agent}
              </div>
            )}

            {/* Message bubble */}
            {structured && !isCollapsed ? (
              <StructuredOutputCard
                title={structured.title}
                nodeLabel={structured.nodeLabel}
                content={structured.content}
                tone={structured.tone}
                icon={structured.icon}
                onCollapse={msg.id && msg.content.length > 260 ? () => toggleCollapse(msg.id!) : undefined}
              />
            ) : isCollapsed && msg.summary ? (
              <button
                onClick={() => msg.id && toggleCollapse(msg.id)}
                className="w-full text-left px-3 py-2 rounded-lg bg-base-200 hover:bg-base-300 text-sm transition-colors"
              >
                <span className="line-clamp-1">{msg.summary}</span>
                <span className="text-xs text-muted-foreground"> 点击展开</span>
              </button>
            ) : (
              <div
                className={cn(
                  "px-3 py-2 rounded-lg text-sm",
                  msg.role === "error"
                    ? "bg-error/10 text-error"
                    : msg.role === "user"
                      ? "bg-primary/10 ml-8"
                      : "bg-base-200",
                )}
              >
                {/* Content */}
                {msg.content &&
                  (msg.isLoading ? (
                    <TypewriterText
                      text={msg.content}
                      onComplete={() => msg.id && handleTypewriterComplete(msg.id)}
                      enableAnimation={
                        idx === filtered.length - 1 &&
                        (msg.isLoading || Date.now() - (msg.timestamp ? new Date(msg.timestamp).getTime() : 0) < 1000)
                      }
                    />
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{cleanMessageContent(msg.content)}</p>
                  ))}

                {/* Loading indicator */}
                {msg.isLoading && <span className="loading loading-dots loading-xs mt-1" />}

                {/* Collapse button */}
                {msg.summary && msg.content && msg.content.length > 200 && msg.id && (
                  <button
                    onClick={() => toggleCollapse(msg.id!)}
                    className="text-xs text-primary hover:underline mt-1"
                  >
                    收起
                  </button>
                )}

              </div>
            )}
          </div>
        );
      })}
      <div ref={sentinelRef} />
    </div>
  );
}

/* ---- Sub-components ---- */

function ThinkingBubble({ msg }: { msg: AgentMessage }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="px-3 py-2 rounded-lg bg-base-200/50 text-xs">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left text-muted-foreground hover:text-base-content"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <span>
          {msg.agent} {msg.phase ? `· ${msg.phase}` : "思考中"}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={cn("h-3 w-3 ml-auto transition-transform", expanded && "rotate-180")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {expanded && (
        <div className="mt-2 space-y-1 text-muted-foreground">
          <p>{msg.content}</p>
          {msg.details && <p className="italic">{msg.details}</p>}
          <button
            onClick={() => setExpanded(false)}
            className="text-primary hover:underline mt-1"
          >
            收起思考
          </button>
        </div>
      )}
    </div>
  );
}

type StructuredMessage = {
  title: string;
  nodeLabel: string;
  content: string;
  tone: "outline" | "characters" | "shots" | "default";
  icon: LucideIcon;
};

function getStructuredMessage(msg: AgentMessage): StructuredMessage | null {
  if (!msg.content || msg.role === "user" || msg.role === "error" || msg.role === "thinking" || msg.isLoading) return null;
  const content = cleanMessageContent(msg.content);
  const agentName = AGENT_NAME_MAP[msg.agent] || msg.agent;

  if (content.startsWith("故事大纲已生成")) {
    return {
      title: "故事大纲已生成",
      nodeLabel: "故事大纲节点",
      content,
      tone: "outline",
      icon: FileText,
    };
  }
  if (content.includes("角色") && (content.includes("已生成") || msg.agent === "character")) {
    return {
      title: agentName === "角色" ? "角色设定已生成" : `${agentName}输出完成`,
      nodeLabel: "角色节点",
      content,
      tone: "characters",
      icon: Users,
    };
  }
  if ((content.includes("分镜") || content.includes("镜头")) && (content.includes("已生成") || msg.agent === "shot")) {
    return {
      title: agentName === "分镜" ? "分镜脚本已生成" : `${agentName}输出完成`,
      nodeLabel: "分镜节点",
      content,
      tone: "shots",
      icon: Clapperboard,
    };
  }
  return null;
}

function StructuredOutputCard({
  title,
  nodeLabel,
  content,
  tone,
  icon: Icon,
  onCollapse,
}: {
  title: string;
  nodeLabel: string;
  content: string;
  tone: StructuredMessage["tone"];
  icon: LucideIcon;
  onCollapse?: () => void;
}) {
  const body = content.replace(title, "").trim();
  const accentClass = {
    outline: "border-primary/30 bg-primary/5 text-primary",
    characters: "border-success/30 bg-success/5 text-success",
    shots: "border-warning/30 bg-warning/5 text-warning",
    default: "border-base-300 bg-base-100 text-base-content",
  }[tone];

  return (
    <div className="rounded-lg border border-base-300 bg-base-100 overflow-hidden">
      <div className={cn("px-3 py-2 border-b flex items-center gap-2", accentClass)}>
        <span className="h-7 w-7 rounded-md bg-base-100/80 flex items-center justify-center shrink-0">
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{title}</p>
          <p className="text-xs opacity-80">{nodeLabel}</p>
        </div>
        <span className="badge badge-sm badge-success gap-1">
          <CheckCircle2 className="h-3 w-3" />
          完成
        </span>
      </div>
      <div className="px-3 py-3">
        <p className="text-sm whitespace-pre-wrap break-words leading-6">{body || content}</p>
        <div className="mt-3 flex items-center justify-between border-t border-base-200 pt-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="h-3 w-3" />
            已同步到左侧画布节点
          </span>
          {onCollapse && (
            <button onClick={onCollapse} className="text-xs text-primary hover:underline">
              收起
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function cleanMessageContent(content: string): string {
  return content.replace(/\[object Object\]/g, "结构化内容");
}

function TypewriterText({
  text,
  onComplete,
  enableAnimation,
}: {
  text: string;
  onComplete: () => void;
  enableAnimation: boolean;
}) {
  const [displayed, setDisplayed] = useState(enableAnimation ? "" : text);
  const indexRef = useRef(0);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!enableAnimation || text.length < 50 || completedRef.current) {
      setDisplayed(text);
      return;
    }

    indexRef.current = 0;
    setDisplayed("");
    const interval = setInterval(() => {
      indexRef.current++;
      setDisplayed(text.slice(0, indexRef.current));
      if (indexRef.current >= text.length) {
        clearInterval(interval);
        completedRef.current = true;
        onComplete();
      }
    }, 30);

    return () => clearInterval(interval);
  }, [text, enableAnimation, onComplete]);

  return (
    <p className="whitespace-pre-wrap break-words">
      {displayed}
      {enableAnimation && displayed.length < text.length && (
        <span className="animate-pulse">|</span>
      )}
    </p>
  );
}
