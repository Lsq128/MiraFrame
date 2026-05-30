import { create } from "zustand";
import type { AgentMessage } from "@openoii/shared";

interface MessageState {
  messages: AgentMessage[];
  addMessage: (message: AgentMessage) => void;
  updateMessage: (id: string, partial: Partial<AgentMessage>) => void;
  removeTransientMessages: () => void;
  clearMessages: () => void;
}

export const useMessageStore = create<MessageState>((set) => ({
  messages: [],

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  updateMessage: (id, partial) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...partial } : m)),
    })),
  removeTransientMessages: () =>
    set((state) => ({
      messages: state.messages.filter((m) => !m.isLoading),
    })),
  clearMessages: () => set({ messages: [] }),
}));
