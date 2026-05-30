import { useEffect, useRef } from "react";
import { useRunStore } from "@/stores/runStore";
import { useCharacterStore } from "@/stores/characterStore";
import { useShotStore } from "@/stores/shotStore";
import { useMessageStore } from "@/stores/messageStore";
import { useProjectStore } from "@/stores/projectStore";
import type { WsEventType } from "@openoii/shared";

type WsEventHandler = (data: Record<string, unknown>) => void;

const eventHandlers: Map<WsEventType, WsEventHandler[]> = new Map();

export function registerWsHandler(
  eventType: WsEventType,
  handler: WsEventHandler,
) {
  const handlers = eventHandlers.get(eventType) || [];
  handlers.push(handler);
  eventHandlers.set(eventType, handlers);
}

// Core handlers — wired once per mount via setupCoreHandlers
function setupCoreHandlers() {
  const {
    updateProgress,
    setAwaitingConfirm,
    completeRun,
    failRun,
    cancelRun,
    startRun,
    setRecoverySummary,
  } = useRunStore.getState();
  const { addCharacter, updateCharacter, removeCharacter } =
    useCharacterStore.getState();
  const { addShot, updateShot, removeShot } = useShotStore.getState();
  const { addMessage, removeTransientMessages } = useMessageStore.getState();
  const { updateProject } = useProjectStore.getState();

  registerWsHandler("run_started", (data) => {
    startRun(data.run_id as string, "manual");
    if (data.recovery_summary)
      setRecoverySummary(data.recovery_summary as never);
  });

  registerWsHandler("run_progress", (data) => {
    updateProgress(
      (data.current_agent as string) || null,
      (data.current_stage as string) || null,
      data.progress as number,
    );
  });

  registerWsHandler("run_message", (data) => {
    addMessage({
      id: crypto.randomUUID(),
      projectId: (data.project_id as string) || "",
      runId: (data.run_id as string) || null,
      agent: (data.agent as string) || "system",
      role: (data.role as string) || "assistant",
      content: (data.content as string) || "",
      summary: (data.summary as string) || null,
      progress: (data.progress as number) || null,
      isLoading: (data.isLoading as boolean) || false,
      createdAt: new Date().toISOString(),
    });
  });

  registerWsHandler("run_awaiting_confirm", () => {
    setAwaitingConfirm(true);
    removeTransientMessages();
  });

  registerWsHandler("run_completed", () => completeRun());
  registerWsHandler("run_failed", (data) =>
    failRun((data.error as string) || "Unknown error"),
  );
  registerWsHandler("run_cancelled", () => cancelRun());

  registerWsHandler("character_created", (data) => {
    if (data.character) addCharacter(data.character as never);
  });
  registerWsHandler("character_updated", (data) => {
    if (data.character)
      updateCharacter(
        (data.character as Record<string, unknown>).id as string,
        data.character as never,
      );
  });
  registerWsHandler("character_deleted", (data) => {
    removeCharacter(data.character_id as string);
  });

  registerWsHandler("shot_created", (data) => {
    if (data.shot) addShot(data.shot as never);
  });
  registerWsHandler("shot_updated", (data) => {
    if (data.shot)
      updateShot(
        (data.shot as Record<string, unknown>).id as string,
        data.shot as never,
      );
  });
  registerWsHandler("shot_deleted", (data) => {
    removeShot(data.shot_id as string);
  });

  registerWsHandler("project_updated", (data) => {
    if (data.project) updateProject(data.project as never);
  });
}

export function useWebSocket(projectId: string | null) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    setupCoreHandlers();

    if (!projectId) return;

    const hostname = window.location.hostname;
    const url = `ws://${hostname}:3000/ws/projects`;
    const ws = new WebSocket(url);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({ event: "join", data: { project_id: projectId } }),
      );
    };

    ws.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data);
        const handlers = eventHandlers.get(type as WsEventType) || [];
        handlers.forEach((handler) => handler(data || {}));
      } catch {
        // Ignore parse errors
      }
    };

    ws.onclose = () => {
      console.log("WS disconnected, reconnecting in 3s...");
      setTimeout(() => {
        /* React will re-render and reconnect */
      }, 3000);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [projectId]);

  return wsRef;
}
