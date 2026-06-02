"use client";

import { forwardRef, useState, useEffect, useRef, useCallback } from "react";
import type { ComponentType } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Film,
  Image,
  Info,
  Play,
  RefreshCw,
  TriangleAlert,
  Sparkles,
  Users,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { StagePipeline } from "@/components/layout/StagePipeline";
import { ChatDrawer } from "@/components/chat/ChatDrawer";
import { useProjectStore } from "@/stores/projectStore";
import { useCharacterStore } from "@/stores/characterStore";
import { useShotStore } from "@/stores/shotStore";
import { useRunStore } from "@/stores/runStore";
import { useMessageStore } from "@/stores/messageStore";
import { useChatPanelStore } from "@/stores/chatPanelStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { projectsApi } from "@/services/projectsApi";
import { cn } from "@/lib/utils";
import type { Character, Shot } from "@/types";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const projectId = id ? parseInt(id) : null;

  // ── State from Zustand stores ──
  // IMPORTANT: each field needs its own selector, or use useShallow.
  // Returning a new object { a, b } from a selector causes infinite loops.
  const setProject = useProjectStore((s) => s.setProject);
  const clearProject = useProjectStore((s) => s.clearProject);
  const setProjectTitle = useProjectStore((s) => s.setProjectTitle);
  const setCharacters = useCharacterStore((s) => s.setCharacters);
  const clearCharacters = useCharacterStore((s) => s.clearCharacters);
  const setShots = useShotStore((s) => s.setShots);
  const clearShots = useShotStore((s) => s.clearShots);
  const setMessages = useMessageStore((s) => s.setMessages);
  const clearMessages = useMessageStore((s) => s.clearMessages);

  // Subscriptions for rendering (single-value selectors are safe)
  const projectTitle = useProjectStore((s) => s.projectTitle);
  const isGenerating = useRunStore((s) => s.isGenerating);
  const currentStage = useRunStore((s) => s.currentStage);
  const currentRunId = useRunStore((s) => s.currentRunId);
  const awaitingConfirm = useRunStore((s) => s.awaitingConfirm);
  const awaitingAgent = useRunStore((s) => s.awaitingAgent);
  const recoveryControl = useRunStore((s) => s.recoveryControl);
  const setGenerating = useRunStore((s) => s.setGenerating);
  const setCurrentStage = useRunStore((s) => s.setCurrentStage);
  const setCurrentRunId = useRunStore((s) => s.setCurrentRunId);
  const setAwaitingConfirm = useRunStore((s) => s.setAwaitingConfirm);
  const resetRunState = useRunStore((s) => s.resetRunState);
  const setProjectOutlineApproved = useProjectStore((s) => s.setProjectOutlineApproved);

  // Local UI
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const autoStartTriggered = useRef(false);
  const generateRequestToken = useRef(0);
  const openChatPanel = useChatPanelStore((s) => s.open);

  // WebSocket — always connected
  const { send } = useWebSocket(projectId);

  // ---- Queries (fetch initial data, sync to stores) ----
  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => projectsApi.get(projectId!),
    enabled: !!projectId,
  });

  const charactersQuery = useQuery({
    queryKey: ["project", projectId, "characters"],
    queryFn: () => projectsApi.getCharacters(projectId!),
    enabled: !!projectId,
  });

  const shotsQuery = useQuery({
    queryKey: ["project", projectId, "shots"],
    queryFn: () => projectsApi.getShots(projectId!),
    enabled: !!projectId,
  });

  const messagesQuery = useQuery({
    queryKey: ["project", projectId, "messages"],
    queryFn: () => projectsApi.getMessages(projectId!),
    enabled: !!projectId,
  });

  const latestRunQuery = useQuery({
    queryKey: ["project", projectId, "latest-run"],
    queryFn: () => projectsApi.getLatestRun(projectId!),
    enabled: !!projectId,
    refetchInterval: isGenerating ? 5000 : false,
  });

  // ---- Sync queries -> stores (initial load) ----
  useEffect(() => { if (projectQuery.data) setProject(projectQuery.data); }, [projectQuery.data, setProject]);
  useEffect(() => { if (charactersQuery.data) setCharacters(charactersQuery.data); }, [charactersQuery.data, setCharacters]);
  useEffect(() => { if (shotsQuery.data) setShots(shotsQuery.data); }, [shotsQuery.data, setShots]);
  useEffect(() => {
    if (messagesQuery.data?.length) {
      setMessages(messagesQuery.data.map((msg) => ({
        id: `db_${msg.id}`,
        agent: msg.agent,
        role: msg.role,
        content: msg.content,
        summary: msg.summary || undefined,
        progress: msg.progress || undefined,
        isLoading: msg.is_loading || false,
        timestamp: msg.created_at,
      })));
    }
  }, [messagesQuery.data, setMessages]);

  // ---- Mutations ----
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error("No project");
      const token = ++generateRequestToken.current;
      const result = await projectsApi.generate(projectId);
      if (token !== generateRequestToken.current) throw new Error("STALE_REQUEST");
      return result;
    },
    onSuccess: (data: { run_id?: number; id?: number }) => {
      setGenerating(true);
      setCurrentRunId(data.run_id ?? data.id ?? null);
      setCurrentStage("outline");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => projectsApi.cancel(projectId!, currentRunId),
    onSuccess: () => resetRunState(),
  });

  const feedbackMutation = useMutation({
    mutationFn: (content: string) => projectsApi.feedback(projectId!, content),
  });

  const approveOutlineMutation = useMutation({
    mutationFn: (feedback?: string) => projectsApi.approveOutline(projectId!, feedback),
    onSuccess: (data) => {
      setProjectOutlineApproved(true);
      setAwaitingConfirm(false);
      if (data.run_id) {
        setCurrentRunId(data.run_id);
        setGenerating(true);
        setCurrentStage("characters");
      }
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: ({ runId, feedback }: { runId: number; feedback?: string }) =>
      projectsApi.resume(projectId!, runId, feedback),
    onSuccess: () => {
      setAwaitingConfirm(false);
      setGenerating(true);
    },
  });

  // ---- Handlers ----
  const handleGenerate = useCallback(() => {
    clearMessages();
    setCurrentStage("outline");
    generateMutation.mutate();
  }, [clearMessages, setCurrentStage, generateMutation]);

  const handleCancel = useCallback(() => cancelMutation.mutate(), [cancelMutation]);

  const handleSendFeedback = useCallback((content: string) => feedbackMutation.mutate(content), [feedbackMutation]);

  const handleConfirm = useCallback((feedback?: string) => {
    const isOutlineGate = awaitingAgent === "outline" || !!projectQuery.data?.story_outline && !projectQuery.data?.outline_approved;
    if (projectId && isOutlineGate) {
      approveOutlineMutation.mutate(feedback);
      return;
    }
    if (currentRunId) resumeMutation.mutate({ runId: currentRunId, feedback });
  }, [approveOutlineMutation, awaitingAgent, currentRunId, projectId, projectQuery.data?.outline_approved, projectQuery.data?.story_outline, resumeMutation]);

  const handleContinuePlanning = useCallback(async () => {
    if (!projectId) return;
    const result = await projectsApi.generate(projectId, { target_stage: "plan_characters" });
    const queuedRun = result as typeof result & { run_id?: number };
    setGenerating(true);
    setCurrentRunId(queuedRun.run_id ?? result.id ?? null);
    setCurrentStage("outline");
    openChatPanel();
  }, [openChatPanel, projectId, setCurrentRunId, setCurrentStage, setGenerating]);

  const handleRetryMaterials = useCallback(async () => {
    if (!projectId) return;
    const result = await projectsApi.generate(projectId, { target_stage: "render_shot_images" });
    const queuedRun = result as typeof result & { run_id?: number };
    setGenerating(true);
    setCurrentRunId(queuedRun.run_id ?? result.id ?? null);
    setCurrentStage("shot_images");
    openChatPanel();
  }, [openChatPanel, projectId, setCurrentRunId, setCurrentStage, setGenerating]);

  // ---- Auto-start ----
  useEffect(() => {
    if (searchParams.get("autoStart") === "true" && projectQuery.data && !autoStartTriggered.current && !isGenerating) {
      autoStartTriggered.current = true;
      clearMessages();
      setCurrentStage("outline");
      generateMutation.mutate();
      openChatPanel();
      searchParams.delete("autoStart");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, projectQuery.data, isGenerating, clearMessages, setCurrentStage, generateMutation, openChatPanel, setSearchParams]);

  // ---- Invalidate React Query when generation completes ----
  const prevGeneratingRef = useRef(isGenerating);
  useEffect(() => {
    if (prevGeneratingRef.current && !isGenerating && projectId) {
      queryClient.invalidateQueries({ queryKey: ["project", projectId, "characters"] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId, "shots"] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId, "latest-run"] });
    }
    prevGeneratingRef.current = isGenerating;
  }, [isGenerating, projectId, queryClient]);

  // ---- Cleanup ----
  useEffect(() => () => { clearProject(); clearCharacters(); clearShots(); clearMessages(); }, []);

  // ---- Render states ----
  if (!projectId) return <div className="min-h-screen flex items-center justify-center">无效的项目 ID</div>;
  if (projectQuery.isLoading) return <div className="min-h-screen flex flex-col items-center justify-center gap-3"><span className="loading loading-spinner loading-lg" /><p className="text-muted-foreground">正在加载项目...</p></div>;
  if (projectQuery.isError || !projectQuery.data) return <div className="min-h-screen flex flex-col items-center justify-center gap-4"><p className="text-lg font-medium">项目未找到</p><button onClick={() => navigate("/")} className="btn btn-primary">返回首页</button></div>;

  const hasRecovery = recoveryControl?.state === "recoverable";

  return (
    <div className="h-screen flex flex-col bg-base-100">
      <TopBar
        onToggleAssets={() => setAssetsOpen(!assetsOpen)} onToggleHistory={() => setHistoryOpen(!historyOpen)}
        assetsOpen={assetsOpen} historyOpen={historyOpen} projectId={projectId}
      />
      <StagePipeline currentStage={currentStage} isGenerating={isGenerating} awaitingConfirm={awaitingConfirm} hasRecovery={hasRecovery} onResume={() => {}} onCancel={handleCancel} />
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas — reads from store (real-time WS updates) */}
        <CanvasArea
          projectTitle={projectTitle}
          currentStage={currentStage}
          isGenerating={isGenerating}
          awaitingConfirm={awaitingConfirm}
          awaitingAgent={awaitingAgent}
          onConfirm={handleConfirm}
          onGenerate={handleGenerate}
          onContinuePlanning={handleContinuePlanning}
          onRetryMaterials={handleRetryMaterials}
          latestRunError={latestRunQuery.data?.error || null}
        />
        {/* Chat — auto-opens when generating */}
        <ChatDrawer onSendFeedback={handleSendFeedback} onConfirm={handleConfirm} onGenerate={handleGenerate} onCancel={handleCancel} isGenerating={isGenerating} />
      </div>
    </div>
  );
}

/** Canvas area — reads from Zustand stores for real-time WS updates */
function CanvasArea({
  projectTitle,
  currentStage,
  isGenerating,
  awaitingConfirm,
  awaitingAgent,
  onConfirm,
  onGenerate,
  onContinuePlanning,
  onRetryMaterials,
  latestRunError,
}: {
  projectTitle: string | null;
  currentStage: string;
  isGenerating: boolean;
  awaitingConfirm: boolean;
  awaitingAgent: string | null;
  onConfirm: (feedback?: string) => void;
  onGenerate: () => void;
  onContinuePlanning: () => void;
  onRetryMaterials: () => void;
  latestRunError: string | null;
}) {
  const characters = useCharacterStore((s) => s.characters);
  const shots = useShotStore((s) => s.shots);
  const storyOutline = useProjectStore((s) => s.projectStoryOutline);
  const visualBible = useProjectStore((s) => s.projectVisualBible);
  const projectVideoUrl = useProjectStore((s) => s.projectVideoUrl);
  const outlineApproved = useProjectStore((s) => s.projectOutlineApproved);
  const outlineRecord = storyOutline as unknown as Record<string, unknown> | null;
  const hasOutline = !!outlineRecord && Object.keys(outlineRecord).length > 0;
  const sortedShots = [...shots].sort((a, b) => a.order - b.order);
  const [selectedNodeId, setSelectedNodeId] = useState("outline");
  const nodeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const hasCharacterImages = characters.length > 0 && characters.every((c) => !!c.image_url);
  const characterImageCount = characters.filter((c) => !!c.image_url).length;
  const hasShotImages = shots.length > 0 && shots.every((s) => !!s.image_url);
  const shotImageCount = shots.filter((s) => !!s.image_url).length;
  const playableVideoCount = shots.filter((s) => isPlayableVideoUrl(s.video_url)).length;
  const taskVideoCount = shots.filter((s) => isTaskVideoUrl(s.video_url)).length;
  const hasShotVideos = shots.length > 0 && playableVideoCount === shots.length;
  const hasMaterialFailure = !!latestRunError && latestRunError.length > 0;
  const awaitingOutline = awaitingConfirm && (awaitingAgent === "outline");
  const awaitingCharacters = awaitingConfirm && awaitingAgent === "characters";
  const awaitingShots = awaitingConfirm && awaitingAgent === "shots";
  const needsOutlineApproval = hasOutline && !outlineApproved;
  const canContinuePlanning = hasOutline && outlineApproved && characters.length === 0 && !isGenerating;
  const activeNodeId = nodeIdForStage(currentStage);

  useEffect(() => {
    if (!activeNodeId) return;
    setSelectedNodeId(activeNodeId);
    window.setTimeout(() => {
      nodeRefs.current[activeNodeId]?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    }, 80);
  }, [activeNodeId]);

  const nodes: WorkflowNode[] = [
    {
      id: "outline",
      label: "故事大纲",
      description: hasOutline ? getOutlineLogline(outlineRecord) || "已生成剧情结构" : "从剧本提炼叙事骨架",
      icon: FileText,
      status: hasOutline ? (awaitingOutline || needsOutlineApproval ? "review" : "done") : currentStage === "outline" && isGenerating ? "active" : "pending",
      metric: hasOutline ? `${getOutlineActs(outlineRecord).length || 1} 段` : "待生成",
    },
    {
      id: "characters",
      label: "角色设定",
      description: characters.length > 0
        ? characters.slice(0, 3).map((c) => c.name).join("、") + (hasCharacterImages ? "（含角色图）" : `（角色图 ${characterImageCount}/${characters.length}）`)
        : "抽取人物并生成角色形象",
      icon: Users,
      status: hasCharacterImages
        ? (awaitingCharacters ? "review" : "done")
        : characters.length > 0 || currentStage === "characters" || currentStage === "characters_approval"
          ? hasMaterialFailure && !isGenerating ? "error" : "active"
          : hasOutline && outlineApproved && isGenerating ? "active" : "pending",
      metric: characters.length ? `${characterImageCount}/${characters.length} 图` : "待生成",
    },
    {
      id: "shots",
      label: "分镜脚本",
      description: shots.length > 0 ? `${shots.length} 个镜头，动作、对白与提示词` : "拆解可生成镜头",
      icon: Film,
      status: shots.length > 0 ? (awaitingShots ? "review" : "done") : characters.length > 0 && isGenerating && (currentStage === "shots" || currentStage === "shots_approval") ? "active" : "pending",
      metric: `${shots.length} 镜`,
    },
    {
      id: "shotImages",
      label: "镜头画面",
      description: hasShotVideos ? "镜头视频片段已生成" : hasShotImages ? "分镜帧已生成，继续生成视频" : "由分镜生成镜头视频",
      icon: Image,
      status: hasShotVideos
        ? "done"
        : shots.length > 0 && (hasMaterialFailure || taskVideoCount > 0) && !isGenerating
          ? "error"
          : currentStage === "shot_images" && isGenerating || playableVideoCount > 0 || shotImageCount > 0
            ? "active"
            : "pending",
      metric: `${playableVideoCount}/${shots.length || 0} 视频`,
    },
    {
      id: "output",
      label: "合成输出",
      description: isFinalVideoUrl(projectVideoUrl) ? "最终视频已输出" : projectVideoUrl ? "镜头连续播放预览已生成" : hasShotVideos ? "视频片段准备输出" : "合成最终漫剧视频",
      icon: Download,
      status: projectVideoUrl && !isInternalCompositionUrl(projectVideoUrl) ? "done" : currentStage === "output" && isGenerating ? "active" : hasShotVideos ? "active" : "pending",
      metric: isFinalVideoUrl(projectVideoUrl) ? "成片" : projectVideoUrl ? "预览" : `${playableVideoCount} 段`,
    },
  ];  const selectedNode = nodes.find((node) => node.id === selectedNodeId) || nodes[0];

  return (
    <div className="flex-1 overflow-hidden bg-[#f7f8fb]">
      <div className="h-full flex flex-col">
        <div className="h-12 shrink-0 border-b border-base-300 bg-base-100 px-4 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{projectTitle || "AI 漫剧工作台"}</p>
            <p className="text-xs text-muted-foreground">节点化生成流程</p>
          </div>
          <div className="flex items-center gap-2">
            {(awaitingConfirm || needsOutlineApproval) && (
              <button onClick={() => onConfirm()} className="btn btn-primary btn-sm gap-1">
                <CheckCircle2 className="h-4 w-4" />
                确认进入下一步
              </button>
            )}
            {!isGenerating && !hasOutline && (
              <button onClick={onGenerate} className="btn btn-primary btn-sm gap-1">
                <Play className="h-4 w-4" />
                开始生成
              </button>
            )}
            {canContinuePlanning && (
              <button onClick={onContinuePlanning} className="btn btn-primary btn-sm gap-1">
                <Play className="h-4 w-4" />
                生成角色和分镜
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-[minmax(680px,1fr)_420px] overflow-hidden">
          <div className="relative overflow-auto halftone-bg">
            <div className="relative min-h-[640px] min-w-[860px] p-8">
              <WorkflowConnectors />
              <div className="grid grid-cols-3 gap-x-14 gap-y-12 relative z-10">
                {nodes.map((node, index) => (
                  <WorkflowNodeCard
                    ref={(element) => { nodeRefs.current[node.id] = element; }}
                    key={node.id}
                    node={node}
                    index={index}
                    selected={node.id === selectedNode.id}
                    onSelect={() => setSelectedNodeId(node.id)}
                  />
                ))}
              </div>
            </div>
          </div>

          <aside className="border-l border-base-300 bg-base-100 overflow-y-auto">
            <NodeDetail
              selectedNode={selectedNode}
              outline={outlineRecord}
              visualBible={visualBible}
              characters={characters}
              shots={sortedShots}
              projectVideoUrl={projectVideoUrl}
              awaitingConfirm={awaitingConfirm}
              awaitingAgent={awaitingAgent}
              awaitingOutline={awaitingOutline}
              needsOutlineApproval={needsOutlineApproval}
              canContinuePlanning={canContinuePlanning}
              latestRunError={latestRunError}
              taskVideoCount={taskVideoCount}
              onContinuePlanning={onContinuePlanning}
              onRetryMaterials={onRetryMaterials}
              onConfirm={onConfirm}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}

type WorkflowStatus = "pending" | "active" | "review" | "done" | "error";

interface WorkflowNode {
  id: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  status: WorkflowStatus;
  metric: string;
}

const WorkflowNodeCard = forwardRef<HTMLButtonElement, {
  node: WorkflowNode;
  index: number;
  selected: boolean;
  onSelect: () => void;
}>(function WorkflowNodeCard({
  node,
  index,
  selected,
  onSelect,
}, ref) {
  const Icon = node.icon;
  const column = index % 3;
  const shouldOffset = column === 1;

  return (
    <button
      ref={ref}
      onClick={onSelect}
      className={cn(
        "h-[148px] text-left rounded-lg border bg-base-100 p-4 transition-all relative",
        shouldOffset && "translate-y-8",
        selected ? "border-primary shadow-[0_0_0_3px_rgba(59,130,246,0.12)]" : "border-base-300 hover:border-primary/40",
        node.status === "active" && "ring-2 ring-warning/30",
        node.status === "review" && "ring-2 ring-primary/30",
        node.status === "error" && "ring-2 ring-error/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn(
          "h-9 w-9 rounded-lg flex items-center justify-center",
          node.status === "done" && "bg-success/10 text-success",
          node.status === "active" && "bg-warning/10 text-warning",
          node.status === "review" && "bg-primary/10 text-primary",
          node.status === "error" && "bg-error/10 text-error",
          node.status === "pending" && "bg-base-200 text-muted-foreground",
        )}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <StatusBadge status={node.status} />
      </div>
      <div className="mt-4">
        <p className="text-sm font-semibold">{node.label}</p>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{node.description}</p>
      </div>
      <div className="absolute left-4 bottom-3 text-xs font-medium text-base-content">{node.metric}</div>
    </button>
  );
});

function WorkflowConnectors() {
  return (
    <svg className="absolute inset-0 h-full w-full pointer-events-none z-0" aria-hidden="true">
      <defs>
        <marker id="workflow-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 Z" fill="#cbd5e1" />
        </marker>
      </defs>
      <path d="M260 100 C335 100, 335 132, 410 132" stroke="#cbd5e1" strokeWidth="2" fill="none" markerEnd="url(#workflow-arrow)" />
      <path d="M600 132 C675 132, 675 100, 750 100" stroke="#cbd5e1" strokeWidth="2" fill="none" markerEnd="url(#workflow-arrow)" />
      <path d="M750 235 C675 290, 335 290, 260 347" stroke="#cbd5e1" strokeWidth="2" fill="none" markerEnd="url(#workflow-arrow)" />
      <path d="M260 347 C335 347, 335 379, 410 379" stroke="#cbd5e1" strokeWidth="2" fill="none" markerEnd="url(#workflow-arrow)" />
    </svg>
  );
}

function StatusBadge({ status }: { status: WorkflowStatus }) {
  const config = {
    pending: { label: "待处理", className: "badge-outline text-muted-foreground", icon: Clock3 },
    active: { label: "生成中", className: "badge-warning", icon: RefreshCw },
    review: { label: "待确认", className: "badge-info", icon: CheckCircle2 },
    done: { label: "完成", className: "badge-success", icon: CheckCircle2 },
    error: { label: "需处理", className: "badge-error", icon: TriangleAlert },
  }[status];
  const Icon = config.icon;

  return (
    <span className={cn("badge badge-sm gap-1", config.className)}>
      <Icon className={cn("h-3 w-3", status === "active" && "animate-spin")} />
      {config.label}
    </span>
  );
}

function NodeDetail({
  selectedNode,
  outline,
  visualBible,
  characters,
  shots,
  projectVideoUrl,
  awaitingConfirm,
  awaitingAgent,
  awaitingOutline,
  needsOutlineApproval,
  canContinuePlanning,
  latestRunError,
  taskVideoCount,
  onContinuePlanning,
  onRetryMaterials,
  onConfirm,
}: {
  selectedNode: WorkflowNode;
  outline: Record<string, unknown> | null;
  visualBible: string | null;
  characters: Character[];
  shots: Shot[];
  projectVideoUrl: string | null;
  awaitingConfirm: boolean;
  awaitingAgent: string | null;
  awaitingOutline: boolean;
  needsOutlineApproval: boolean;
  canContinuePlanning: boolean;
  latestRunError: string | null;
  taskVideoCount: number;
  onContinuePlanning: () => void;
  onRetryMaterials: () => void;
  onConfirm: (feedback?: string) => void;
}) {
  const missingCharacterImages = characters.filter((c) => !c.image_url);
  const playableVideoCount = shots.filter((s) => isPlayableVideoUrl(s.video_url)).length;
  const missingShotVideos = shots.filter((s) => !isPlayableVideoUrl(s.video_url));
  const showMaterialIssue =
    selectedNode.id === "characters" && missingCharacterImages.length > 0 && latestRunError ||
    selectedNode.id === "shotImages" && (missingShotVideos.length > 0 || taskVideoCount > 0) && latestRunError ||
    selectedNode.id === "output" && missingShotVideos.length > 0 && latestRunError;

  return (
    <div className="h-full p-5">
      <div className="flex items-start justify-between gap-3 border-b border-base-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-base font-semibold">{selectedNode.label}</p>
            <StatusBadge status={selectedNode.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">{selectedNode.description}</p>
          <p className="text-xs font-medium mt-2">{selectedNode.metric}</p>
        </div>
        {selectedNode.id === "outline" && (awaitingOutline || needsOutlineApproval) && (
          <button onClick={() => onConfirm()} className="btn btn-primary btn-sm gap-1 shrink-0">
            <CheckCircle2 className="h-4 w-4" />
            确认大纲
          </button>
        )}
        {selectedNode.id === "characters" && awaitingConfirm && awaitingAgent === "characters" && (
          <button onClick={() => onConfirm()} className="btn btn-primary btn-sm gap-1 shrink-0">
            <CheckCircle2 className="h-4 w-4" />
            确认角色
          </button>
        )}
        {selectedNode.id === "shots" && awaitingConfirm && awaitingAgent === "shots" && (
          <button onClick={() => onConfirm()} className="btn btn-primary btn-sm gap-1 shrink-0">
            <CheckCircle2 className="h-4 w-4" />
            确认分镜
          </button>
        )}
      </div>

      {showMaterialIssue && (
        <div className="mt-4 rounded-lg border border-error/30 bg-error/5 p-3">
          <div className="flex items-start gap-2">
            <TriangleAlert className="h-4 w-4 text-error mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-error">生成未完成</p>
              <p className="text-xs text-base-content/80 mt-1">{formatRunError(latestRunError)}</p>
              {taskVideoCount > 0 && (
                <p className="text-xs text-base-content/70 mt-1">检测到 {taskVideoCount} 条视频仍是任务地址，尚不是可播放视频。</p>
              )}
              <button onClick={onRetryMaterials} className="btn btn-error btn-xs mt-3 gap-1">
                <RefreshCw className="h-3.5 w-3.5" />
                重试未完成物料
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        {selectedNode.id === "outline" && outline && (
          <OutlineCanvasPreview outline={outline} visualBible={visualBible} compact={false} />
        )}

        {selectedNode.id === "characters" && (
        <div className="grid grid-cols-2 gap-3">
          {characters.length === 0 ? <EmptyNodeContent text="角色设定尚未生成" /> : characters.slice(0, 6).map((c) => (
            <div key={c.id} className="rounded-lg border border-base-200 overflow-hidden bg-base-100">
              {c.image_url ? (
                <img src={c.image_url} alt={c.name} className="h-32 w-full object-cover" />
              ) : (
                <div className="h-32 w-full bg-base-200 flex items-center justify-center text-xs text-muted-foreground">等待角色图</div>
              )}
              <div className="p-3">
                <p className="text-sm font-medium truncate">{c.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-3 mt-1">{c.description}</p>
              </div>
            </div>
          ))}
        </div>
        )}

        {selectedNode.id === "shots" && (
        <div className="space-y-2">
          {shots.length === 0 ? <EmptyNodeContent text="分镜脚本尚未生成" /> : shots.slice(0, 6).map((shot) => (
            <div key={shot.id} className="rounded-lg border border-base-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-muted-foreground">镜头 {shot.order}</p>
                <span className="text-[11px] text-muted-foreground">{shot.duration ? `${shot.duration}s` : ""}</span>
              </div>
              <p className="text-sm line-clamp-3 mt-1">{shot.description || shot.prompt}</p>
            </div>
          ))}
        </div>
        )}



        {selectedNode.id === "shotImages" && (
          <AssetStrip emptyText="镜头视频尚未生成" items={shots.map((s) => ({ id: s.id, title: `镜头 ${s.order}`, url: playableOrPreviewUrl(s), issue: videoIssue(s) }))} />
        )}

        {selectedNode.id === "output" && (
        <div className="rounded-lg border border-base-200 p-4 text-sm">
          {projectVideoUrl && !isInternalCompositionUrl(projectVideoUrl) ? (
            <div className="space-y-2">
              {isFinalVideoUrl(projectVideoUrl) ? (
                <video src={projectVideoUrl} className="w-full rounded-lg border border-base-200 bg-black" controls />
              ) : null}
              <a href={projectVideoUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
                {isFinalVideoUrl(projectVideoUrl) ? "打开输出视频" : "查看合成预览"}
              </a>
              {!isFinalVideoUrl(projectVideoUrl) && (
                <p className="text-xs text-muted-foreground">当前是按镜头顺序连续播放的合成预览，还不是单个 mp4 成片。</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-muted-foreground">等待全部镜头视频完成后输出。</p>
              {isInternalCompositionUrl(projectVideoUrl) && (
                <p className="text-xs text-error">检测到旧版内部合成地址，需要重新执行合成输出。</p>
              )}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Info className="h-4 w-4" />
                当前可播放镜头 {playableVideoCount}/{shots.length || 0}
              </div>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

function EmptyNodeContent({ text }: { text: string }) {
  return <p className="col-span-3 rounded-md border border-dashed border-base-300 p-4 text-center text-xs text-muted-foreground">{text}</p>;
}

function AssetStrip({
  items,
  emptyText,
}: {
  items: Array<{ id: number; title: string; url: string | null; issue?: string | null }>;
  emptyText: string;
}) {
  const visible = items.filter((item) => item.url || item.issue);
  if (visible.length === 0) return <EmptyNodeContent text={emptyText} />;

  return (
    <div className="grid grid-cols-2 gap-3">
	      {visible.slice(0, 8).map((item) => (
	        <div key={item.id} className={cn("rounded-lg border overflow-hidden bg-base-100", item.issue ? "border-error/30" : "border-base-200")}>
            {item.url ? (
              isPlayableVideoUrl(item.url) ? (
                <video src={item.url} className="h-28 w-full object-cover" controls />
              ) : (
                <img src={item.url} alt={item.title} className="h-28 w-full object-cover" />
              )
            ) : (
              <div className="h-28 w-full bg-base-200 flex items-center justify-center text-xs text-muted-foreground">等待生成</div>
            )}
            <div className="px-2 py-2">
	            <p className="text-xs font-medium truncate">{item.title}</p>
              {item.issue && <p className="text-[11px] text-error mt-1">{item.issue}</p>}
            </div>
	        </div>
	      ))}
    </div>
  );
}

function isPlayableVideoUrl(url?: string | null): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov)(\?|#|$)/i.test(url) || url.includes(".oss-") && url.includes(".mp4");
}

function isTaskVideoUrl(url?: string | null): boolean {
  return !!url && /\/tasks\/[^/?#]+/i.test(url);
}

function isInternalCompositionUrl(url?: string | null): boolean {
  return !!url && url.startsWith("openoii:composition:");
}

function isFinalVideoUrl(url?: string | null): boolean {
  return isPlayableVideoUrl(url);
}

function playableOrPreviewUrl(shot: Shot): string | null {
  return isPlayableVideoUrl(shot.video_url) ? shot.video_url! : shot.image_url || null;
}

function videoIssue(shot: Shot): string | null {
  if (isPlayableVideoUrl(shot.video_url)) return null;
  if (isTaskVideoUrl(shot.video_url)) return "视频任务未返回可播放文件";
  if (shot.image_url) return "等待镜头视频";
  return "等待分镜帧";
}

function formatRunError(error: string | null): string {
  if (!error) return "生成服务暂时没有返回明确错误。";
  if (error.includes("AllocationQuota.FreeTierOnly")) return "视频模型免费额度已耗尽，需要在模型服务侧关闭“仅使用免费额度”或更换/充值额度后重试。";
  if (error.includes("429") || error.includes("RateQuota")) return "外部生成服务触发限流，请稍后重试。";
  if (error.includes("did not finish")) return "视频任务生成时间过长，本次轮询超时；可以稍后重试未完成镜头。";
  return error;
}

function nodeIdForStage(stage: string): string {
  if (stage === "outline" || stage === "outline_approval") return "outline";
  if (stage === "characters" || stage === "characters_approval") return "characters";
  if (stage === "shots" || stage === "shots_approval") return "shots";
  if (stage === "shot_images") return "shotImages";
  if (stage === "output") return "output";
  return "outline";
}

function OutlineCanvasPreview({
  outline,
  visualBible,
  compact = false,
}: {
  outline: Record<string, unknown>;
  visualBible: string | null;
  compact?: boolean;
}) {
  const title = textOf(outline.title);
  const logline = getOutlineLogline(outline);
  const acts = getOutlineActs(outline);

  return (
    <div className={cn("space-y-3", compact && "space-y-2")}>
      {title && <p className="font-semibold text-base">{title}</p>}
      {logline && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{logline}</p>}
      {acts.length > 0 && (
        <div className={cn("grid gap-2", compact ? "grid-cols-3" : "grid-cols-1")}>
          {acts.slice(0, compact ? 3 : 6).map((act, index) => (
            <div key={index} className="rounded border border-base-300 bg-base-100 p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1">段落 {index + 1}</p>
              <p className="text-sm">{act}</p>
            </div>
          ))}
        </div>
      )}
      {visualBible && (
        <div className="rounded border border-primary/20 bg-primary/5 p-3">
          <p className="text-xs font-medium text-primary mb-1">视觉风格</p>
          <p className="text-sm">{visualBible}</p>
        </div>
      )}
      {!title && !logline && acts.length === 0 && (
        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(outline, null, 2)}</pre>
      )}
    </div>
  );
}

function getOutlineLogline(outline: Record<string, unknown> | null): string | null {
  if (!outline) return null;
  return textOf(outline.logline || outline.summary || outline.raw);
}

function getOutlineActs(outline: Record<string, unknown> | null): string[] {
  if (!outline) return [];
  return Array.isArray(outline.acts)
    ? outline.acts.map(formatOutlineItem)
    : Array.isArray(outline.chapters)
      ? outline.chapters.map(formatOutlineItem)
      : [];
}

function textOf(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function formatOutlineItem(value: unknown): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return String(value);
  const record = value as Record<string, unknown>;
  const title = textOf(record.title);
  const summary = textOf(record.summary || record.description);
  const act = record.act || record.order || record.index;

  if (title && summary) return `${act ? `第${act}幕：` : ""}${title} - ${summary}`;
  if (title) return `${act ? `第${act}幕：` : ""}${title}`;
  if (summary) return summary;
  return JSON.stringify(record);
}
