import { create } from "zustand";
import type { AgentMessage } from "@/types";

// Transient progress message patterns (Chinese) — matched against content
const TRANSIENT_MESSAGE_PATTERNS = [
  /^正在生成视频\s+\d+\/\d+/,
  /^开始生成\s+\d+\s*个分镜生成视频/,
  /^开始拼接\s+\d+\s*个分镜视频/,
];

function isTransientProgressMessage(msg: AgentMessage): boolean {
  if (msg.isLoading) return true;
  return TRANSIENT_MESSAGE_PATTERNS.some((pattern) => pattern.test(msg.content));
}

interface MessageState {
  messages: AgentMessage[];
  highlightedMessageIndex: number | null;

  addMessage: (message: AgentMessage) => void;
  setMessages: (messages: AgentMessage[]) => void;
  clearMessages: () => void;
  setHighlightedMessage: (index: number | null) => void;

  /** Remove transient progress messages (loading + pattern-matched) */
  removeTransientMessages: () => void;
  /** Clear loading states for a specific agent */
  clearLoadingStates: (agent?: string | null) => void;
  /** Clean up stale system messages */
  cleanupStaleMessages: (completedAgent?: string | null) => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  messages: [],
  highlightedMessageIndex: null,

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setMessages: (messages) => set({ messages }),

  clearMessages: () => set({ messages: [], highlightedMessageIndex: null }),

  setHighlightedMessage: (index) => set({ highlightedMessageIndex: index }),

  removeTransientMessages: () =>
    set((state) => ({
      messages: state.messages.filter((m) => !isTransientProgressMessage(m)),
    })),

  clearLoadingStates: (agent) =>
    set((state) => {
      let changed = false;
      const updated = state.messages.map((m) => {
        if (m.isLoading && (!agent || m.agent === agent)) {
          changed = true;
          return { ...m, isLoading: false };
        }
        return m;
      });
      return changed ? { messages: updated } : state;
    }),

  cleanupStaleMessages: (completedAgent) =>
    set((state) => {
      const filtered = state.messages.filter((m) => {
        // Remove info messages containing "已确认" or "继续执行"
        if (
          m.role === "info" &&
          m.agent === "system" &&
          (m.content.includes("已确认") || m.content.includes("继续执行"))
        ) {
          return false;
        }
        // Remove empty content messages without summary
        if (!m.content && !m.summary) return false;
        // Remove transient progress messages
        if (isTransientProgressMessage(m)) return false;
        return true;
      });
      if (filtered.length !== state.messages.length) {
        return { messages: filtered };
      }
      return state;
    }),
}));
