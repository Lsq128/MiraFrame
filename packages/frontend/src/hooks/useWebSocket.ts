"use client";

import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useRunStore } from "@/stores/runStore";
import { useCharacterStore } from "@/stores/characterStore";
import { useShotStore } from "@/stores/shotStore";
import { useMessageStore } from "@/stores/messageStore";
import { useProjectStore } from "@/stores/projectStore";
import { resolveEventStage } from "@/utils/workflowStage";
import type { AgentMessage, WorkflowStage } from "@/types";

// ---- Module-level state (shared across hook instances) ----
const globalSockets = new Map<number, Socket>();
let messageIdCounter = 0;

function generateMessageId(): string {
  messageIdCounter++;
  return `msg_${Date.now()}_${messageIdCounter}`;
}

function getWsBase(): string {
  if (typeof window === "undefined") return "http://localhost:3000";
  return `http://${window.location.hostname}:3000`;
}


const TRANSIENT_MESSAGE_PATTERNS = [
  /^正在生成视频\s+\d+\/\d+/,
  /^开始生成\s+\d+\s*个分镜生成视频/,
  /^开始拼接\s+\d+\s*个分镜视频/,
];

function isTransientProgressMessage(msg: AgentMessage): boolean {
  if (msg.isLoading) return true;
  return TRANSIENT_MESSAGE_PATTERNS.some((p) => p.test(msg.content));
}

function getStores() {
  return {
    run: useRunStore.getState(),
    character: useCharacterStore.getState(),
    shot: useShotStore.getState(),
    message: useMessageStore.getState(),
    project: useProjectStore.getState(),
  };
}

// ---- Apply a server event to stores ----
function applyEvent(eventName: string, data: Record<string, unknown>) {
  const stores = getStores();

  switch (eventName) {
    case "connected":
      break;

    case "error":
      stores.message.addMessage({
        id: generateMessageId(),
        agent: "system",
        role: "error",
        content: (data.message as string) || "Unknown error",
      });
      break;

    case "run_started": {
      const runId = data.run_id as number;
      stores.run.startRun(runId, stores.run.runMode);
      if (data.recovery_summary) stores.run.setRecoverySummary(data.recovery_summary as never);
      if (data.provider_snapshot) stores.run.setCurrentRunProviderSnapshot(data.provider_snapshot as never);
      stores.message.addMessage({
        id: generateMessageId(),
        agent: "system",
        role: "separator",
        content: "开始生成",
        timestamp: new Date().toISOString(),
      });
      break;
    }

    case "run_progress": {
      if (!stores.run.isGenerating) {
        stores.run.setGenerating(true);
        if (data.run_id) stores.run.setCurrentRunId(data.run_id as number);
      }
      stores.run.setCurrentAgent((data.current_agent as string) || null);
      stores.run.setProgress((data.progress as number) || 0);
      if (data.recovery_summary) stores.run.setRecoverySummary(data.recovery_summary as never);
      const stage = resolveEventStage(data);
      if (stage) stores.run.setCurrentStage(stage);
      break;
    }

    case "run_message": {
      stores.message.clearLoadingStates((data.agent as string) || null);
      stores.run.setProgress((data.progress as number) || 0);
      // Update pipeline stage from message data (e.g., stage: "plan_characters")
      const msgStage = resolveEventStage(data);
      if (msgStage) stores.run.setCurrentStage(msgStage);
      const msg: AgentMessage = {
        id: generateMessageId(),
        agent: (data.agent as string) || "system",
        role: (data.role as string) || "assistant",
        content: (data.content as string) || "",
        summary: (data.summary as string) || undefined,
        progress: (data.progress as number) || undefined,
        isLoading: (data.isLoading as boolean) || false,
        phase: (data.phase as AgentMessage["phase"]) || undefined,
        details: (data.details as string) || undefined,
      };
      stores.message.addMessage(msg);
      if (isTransientProgressMessage(msg)) stores.message.cleanupStaleMessages();
      break;
    }

    case "agent_thinking": {
      stores.message.addMessage({
        id: generateMessageId(),
        agent: (data.agent as string) || "system",
        role: "thinking",
        content: (data.content as string) || "",
        phase: (data.phase as AgentMessage["phase"]) || undefined,
        details: (data.details as string) || undefined,
      });
      break;
    }

    case "run_awaiting_confirm": {
      stores.message.clearLoadingStates();
      const agent = (data.agent as string) || "system";
      stores.run.setAwaitingConfirm(true, agent, data.run_id as number);
      stores.run.setRecoveryGate(data as never);
      if (data.recovery_summary) stores.run.setRecoverySummary(data.recovery_summary as never);

      // Update pipeline stage from gate/current_stage
      const stage = resolveEventStage({ stage: data.gate, current_stage: data.current_stage });
      if (stage) stores.run.setCurrentStage(stage);

      if (agent === "outline" && data.story_outline) {
        stores.project.setProjectStoryOutline(data.story_outline as never);
        if (data.visual_bible) stores.project.setProjectVisualBible(data.visual_bible as string);
      }
      stores.message.addMessage({
        id: generateMessageId(),
        agent: "system",
        role: "info",
        content: `等待确认：${data.question || "是否继续？"}`,
      });
      break;
    }

    case "run_confirmed": {
      stores.run.setAwaitingConfirm(false);
      stores.message.addMessage({ id: generateMessageId(), agent: "system", role: "info", content: "已确认" });
      break;
    }

    case "run_completed": {
      stores.message.clearLoadingStates();
      stores.message.cleanupStaleMessages();
      stores.run.completeRun();
      // Set stage to "review" (terminal) to show all pipeline stages as done
      stores.run.setCurrentStage("review");
      if (data.message) {
        stores.message.addMessage({ id: generateMessageId(), agent: "system", role: "assistant", content: data.message as string });
      }
      break;
    }

    case "run_failed": {
      stores.message.clearLoadingStates();
      stores.message.cleanupStaleMessages();
      stores.run.failRun((data.error as string) || "Unknown error");
      stores.message.addMessage({ id: generateMessageId(), agent: (data.agent as string) || "system", role: "error", content: (data.error as string) || "Generation failed" });
      break;
    }

    case "run_cancelled": {
      stores.message.clearLoadingStates();
      stores.run.cancelRun();
      stores.run.setProgress(0);
      stores.message.addMessage({ id: generateMessageId(), agent: "system", role: "info", content: "生成已停止" });
      break;
    }

    case "character_created":
    case "character_updated":
      if (data.character) stores.character.updateCharacter(data.character as never);
      break;

    case "character_deleted":
      stores.character.removeCharacter(data.character_id as number);
      break;

    case "shot_created":
    case "shot_updated":
      if (data.shot) stores.shot.updateShot(data.shot as never);
      break;

    case "shot_deleted":
      stores.shot.removeShot(data.shot_id as number);
      break;

    case "data_cleared": {
      const cleared = data.clearedTypes as string[] | undefined;
      if (cleared?.includes("characters")) stores.character.clearCharacters();
      if (cleared?.includes("shots")) stores.shot.clearShots();
      stores.project.setProjectVideoUrl(null);
      break;
    }

    case "outline_updated": {
      if (data.story_outline) stores.project.setProjectStoryOutline(data.story_outline as never);
      if (data.visual_bible !== undefined) stores.project.setProjectVisualBible(data.visual_bible as string);
      if (data.outline_approved !== undefined) stores.project.setProjectOutlineApproved(data.outline_approved as boolean);
      stores.project.setProjectUpdatedAt(Date.now());
      break;
    }

    case "project_updated": {
      const p = data as Record<string, unknown>;
      const setters: Record<string, (v: unknown) => void> = {
        title: (v) => stores.project.setProjectTitle(v as string),
        story: (v) => stores.project.setProjectStory(v as string),
        style: (v) => stores.project.setProjectStyle(v as string),
        summary: (v) => stores.project.setProjectSummary(v as string),
        status: (v) => stores.project.setProjectStatus(v as string),
        video_url: (v) => stores.project.setProjectVideoUrl(v as string),
        target_shot_count: (v) => stores.project.setProjectTargetShotCount(v as number),
        character_hints: (v) => stores.project.setProjectCharacterHints(v as string[]),
        creation_mode: (v) => stores.project.setProjectCreationMode(v as string),
        outline_approved: (v) => stores.project.setProjectOutlineApproved(v as boolean),
        universe_id: (v) => stores.project.setProjectUniverseId(v as number),
        chapter_number: (v) => stores.project.setProjectChapterNumber(v as number),
        chapter_title: (v) => stores.project.setProjectChapterTitle(v as string),
        provider_settings: (v) => stores.project.setProjectProviderSettings(v as never),
        blocking_clips: (v) => stores.project.setBlockingClips(v as never),
        story_outline: (v) => stores.project.setProjectStoryOutline(v as never),
        visual_bible: (v) => stores.project.setProjectVisualBible(v as string),
        reference_images: (v) => stores.project.setProjectReferenceImages(v as string[]),
        exports: (v) => stores.project.setProjectExports(v as string[]),
      };
      for (const [key, setter] of Object.entries(setters)) {
        if (key in p && p[key] !== undefined) setter(p[key]);
      }
      stores.project.setProjectUpdatedAt(Date.now());
      break;
    }

    case "critique_result": {
      const dims = data.dimensions as Record<string, number>;
      const dimText = dims ? Object.entries(dims).map(([k, v]) => `${k}: ${v}`).join(", ") : "";
      stores.message.addMessage({
        id: generateMessageId(),
        agent: "critic",
        role: "assistant",
        content: `评分: ${data.score}/10\n维度: ${dimText}\n问题: ${((data.issues as string[]) || []).join("; ")}\n${data.will_regenerate ? "将重新生成" : "通过审查"}`,
      });
      break;
    }

    case "version_created":
      stores.message.addMessage({ id: generateMessageId(), agent: "system", role: "info", content: `版本已保存 (v${data.version})` });
      break;

    case "version_rollback":
      stores.message.addMessage({ id: generateMessageId(), agent: "system", role: "info", content: `已回滚从 v${data.from_version} 到 v${data.to_version}` });
      break;

    case "audio_generated": {
      if (data.shot_id && data.tts_url) {
        stores.shot.updateShot({ id: data.shot_id as number, tts_url: data.tts_url as string, project_id: 0, order: 0 } as never);
      }
      break;
    }

    case "export_completed":
      break;

    case "bible_updated":
      stores.message.addMessage({ id: generateMessageId(), agent: "system", role: "info", content: "角色圣经已更新" });
      break;

    case "consistency_eval_completed":
      stores.message.addMessage({ id: generateMessageId(), agent: "system", role: "info", content: `一致性评估完成: 总分 ${data.overall_score}, ${data.character_count} 个角色` });
      break;
  }
}

// ---- Hook ----
export function useWebSocket(projectId: number | null) {
  const socketRef = useRef<Socket | null>(null);
  const autoConfirmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sendRef = useRef<(data: Record<string, unknown>) => void>(() => {});

  const scheduleAutoConfirm = useCallback((runId: number) => {
    if (autoConfirmTimer.current) clearTimeout(autoConfirmTimer.current);
    autoConfirmTimer.current = setTimeout(() => {
      sendRef.current({ type: "confirm", data: { run_id: runId } });
    }, 1500);
  }, []);

  // ── Shared event handler factory ──
  // Defined outside useEffect so it's stable and reused across mounts.
  function makeHandler(eventName: string) {
    return (data: Record<string, unknown>) => {
      console.log(`[WS:recv] ← "${eventName}"`, data);
      applyEvent(eventName, data || {});

      if (eventName === "run_awaiting_confirm") {
        const runMode = useRunStore.getState().runMode;
        const autoMode = data.auto_mode as boolean | undefined;
        if (!autoMode && runMode === "yolo") {
          console.log(`[WS:yolo] Auto-confirming run ${data.run_id}`);
          scheduleAutoConfirm(data.run_id as number);
        }
      }
    };
  }

  useEffect(() => {
    if (!projectId) return;

    let socket = globalSockets.get(projectId);

    // Create new socket if needed
    if (!socket || !socket.connected) {
      const wsBase = getWsBase();
      socket = io(`${wsBase}/ws/projects`, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 3000,
        reconnectionAttempts: 5,
      });
      console.log(`[WS] Created new Socket.IO connection for project ${projectId}`);

      socket.on("connect", () => {
        console.log(`[WS] Connected — joining room project:${projectId}`);
        socket!.emit("join", String(projectId));
      });

      socket.on("disconnect", (reason) => {
        console.log(`[WS] Disconnected (${reason})`);
        globalSockets.delete(projectId!);
      });

      socket.on("connect_error", (err) => {
        console.error(`[WS] Connection error:`, err.message);
      });

      globalSockets.set(projectId, socket);
    } else {
      console.log(`[WS] Reusing existing socket for project ${projectId} (already connected)`);
      // If already in the room, re-join just in case
      socket.emit("join", String(projectId));
    }

    socketRef.current = socket;

    // (Re-)register all event handlers — use socket.off first to prevent duplicates
    const eventNames = [
      "connected", "error",
      "run_started", "run_progress", "run_message", "agent_thinking",
      "run_completed", "run_failed", "run_awaiting_confirm", "run_confirmed", "run_cancelled",
      "character_created", "character_updated", "character_deleted",
      "shot_created", "shot_updated", "shot_deleted",
      "outline_updated", "project_updated", "data_cleared",
      "critique_result", "bible_updated", "version_created", "version_rollback",
      "audio_generated", "export_completed", "consistency_eval_completed",
    ];

    for (const eventName of eventNames) {
      socket.off(eventName); // Remove any previous listener
      const handler = makeHandler(eventName);
      socket.on(eventName, handler);
    }

    // Set up send function
    sendRef.current = (data: Record<string, unknown>) => {
      const s = globalSockets.get(projectId!);
      if (s?.connected) {
        s.emit("confirm", data);
      } else {
        console.warn("[WS] Cannot send — socket not connected");
      }
    };

    return () => {
      // Cleanup: remove handlers when projectId changes or component unmounts
      for (const eventName of eventNames) {
        socket?.off(eventName);
      }
    };
  }, [projectId, scheduleAutoConfirm]);

  const send = useCallback(
    (data: Record<string, unknown>) => {
      const socket = globalSockets.get(projectId!);
      if (socket?.connected) {
        socket.emit("confirm", data);
      }
    },
    [projectId],
  );

  return { send };
}
