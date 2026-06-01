"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ComponentType } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock3,
  Download,
  FileText,
  Film,
  GitBranch,
  Image,
  Play,
  RefreshCw,
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
}: {
  projectTitle: string | null;
  currentStage: string;
  isGenerating: boolean;
  awaitingConfirm: boolean;
  awaitingAgent: string | null;
  onConfirm: (feedback?: string) => void;
  onGenerate: () => void;
  onContinuePlanning: () => void;
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
  const hasCharacterImages = characters.some((c) => !!c.image_url);
  const hasShotImages = shots.some((s) => !!s.image_url);
  const hasShotVideos = shots.some((s) => !!s.video_url);
  const awaitingOutline = awaitingConfirm && (awaitingAgent === "outline");
  const needsOutlineApproval = hasOutline && !outlineApproved;
  const canContinuePlanning = hasOutline && outlineApproved && characters.length === 0 && !isGenerating;

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
        ? characters.slice(0, 3).map((c) => c.name).join("、") + (characters.some((c) => !!c.image_url) ? "（含角色图）" : "")
        : "抽取人物并生成角色形象",
      icon: Users,
      status: characters.length > 0 ? "done" : hasOutline && outlineApproved && isGenerating && (currentStage === "characters" || currentStage === "characters_approval") ? "active" : "pending",
      metric: `${characters.length} 个`,
    },
    {
      id: "shots",
      label: "分镜脚本",
      description: shots.length > 0 ? `${shots.length} 个镜头，动作、对白与提示词` : "拆解可生成镜头",
      icon: Film,
      status: shots.length > 0 ? "done" : characters.length > 0 && isGenerating && (currentStage === "shots" || currentStage === "shots_approval") ? "active" : "pending",
      metric: `${shots.length} 镜`,
    },
    {
      id: "shotImages",
      label: "镜头画面",
      description: hasShotVideos ? "镜头视频片段已生成" : hasShotImages ? "分镜帧已生成" : "由分镜生成镜头视频",
      icon: Image,
      status: hasShotVideos ? "done" : currentStage === "shot_images" && isGenerating ? "active" : "pending",
      metric: `${shots.filter((s) => !!s.video_url).length}/${shots.length || 0}`,
    },
    {
      id: "output",
      label: "合成输出",
      description: projectVideoUrl || hasShotVideos ? "视频片段准备输出" : "合成最终漫剧视频",
      icon: Download,
      status: projectVideoUrl ? "done" : currentStage === "output" && isGenerating ? "active" : "pending",
      metric: projectVideoUrl ? "已输出" : `${shots.filter((s) => !!s.video_url).length} 段`,
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

        <div className="flex-1 min-h-0 grid grid-cols-[minmax(720px,1fr)_320px] overflow-hidden">
          <div className="relative overflow-auto halftone-bg">
            <div className="relative min-h-[720px] min-w-[900px] p-8">
              <WorkflowConnectors />
              <div className="grid grid-cols-3 gap-x-14 gap-y-12 relative z-10">
                {nodes.map((node, index) => (
                  <WorkflowNodeCard
                    key={node.id}
                    node={node}
                    index={index}
                    selected={node.id === selectedNode.id}
                    onSelect={() => setSelectedNodeId(node.id)}
                  />
                ))}
              </div>
              <div className="absolute left-8 right-8 bottom-8 z-10 rounded-lg border border-base-300 bg-base-100/95 p-4">
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
                  onContinuePlanning={onContinuePlanning}
                  onConfirm={onConfirm}
                />
              </div>
            </div>
          </div>

          <aside className="border-l border-base-300 bg-base-100 overflow-y-auto">
            <div className="p-4 border-b border-base-200">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <GitBranch className="h-4 w-4 text-primary" />
                流程状态
              </div>
              <p className="text-xs text-muted-foreground mt-1">点击节点查看当前产物和操作</p>
            </div>
            <div className="p-3 space-y-2">
              {nodes.map((node) => (
                <button
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={cn(
                    "w-full text-left rounded-lg border p-3 transition-colors",
                    node.id === selectedNode.id
                      ? "border-primary/50 bg-primary/5"
                      : "border-base-200 hover:border-base-300 hover:bg-base-200/50",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{node.label}</span>
                    <StatusBadge status={node.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{node.description}</p>
                  <p className="text-xs font-medium mt-2">{node.metric}</p>
                </button>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

type WorkflowStatus = "pending" | "active" | "review" | "done";

interface WorkflowNode {
  id: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  status: WorkflowStatus;
  metric: string;
}

function WorkflowNodeCard({
  node,
  index,
  selected,
  onSelect,
}: {
  node: WorkflowNode;
  index: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = node.icon;
  const column = index % 3;
  const shouldOffset = column === 1;

  return (
    <button
      onClick={onSelect}
      className={cn(
        "h-[148px] text-left rounded-lg border bg-base-100 p-4 transition-all relative",
        shouldOffset && "translate-y-8",
        selected ? "border-primary shadow-[0_0_0_3px_rgba(59,130,246,0.12)]" : "border-base-300 hover:border-primary/40",
        node.status === "active" && "ring-2 ring-warning/30",
        node.status === "review" && "ring-2 ring-primary/30",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={cn(
          "h-9 w-9 rounded-lg flex items-center justify-center",
          node.status === "done" && "bg-success/10 text-success",
          node.status === "active" && "bg-warning/10 text-warning",
          node.status === "review" && "bg-primary/10 text-primary",
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
}

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
  onContinuePlanning,
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
  onContinuePlanning: () => void;
  onConfirm: (feedback?: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <p className="text-sm font-semibold">{selectedNode.label}</p>
          <p className="text-xs text-muted-foreground">{selectedNode.description}</p>
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

      {selectedNode.id === "outline" && outline && (
        <OutlineCanvasPreview outline={outline} visualBible={visualBible} compact />
      )}

      {selectedNode.id === "characters" && (
        <div className="grid grid-cols-3 gap-2">
          {characters.length === 0 ? <EmptyNodeContent text="角色设定尚未生成" /> : characters.slice(0, 6).map((c) => (
            <div key={c.id} className="rounded-md border border-base-200 p-2">
              {c.image_url && <img src={c.image_url} alt={c.name} className="h-20 w-full object-cover rounded mb-1" />}
              <p className="text-sm font-medium truncate">{c.name}</p>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{c.description}</p>
            </div>
          ))}
        </div>
      )}

      {selectedNode.id === "shots" && (
        <div className="grid grid-cols-3 gap-2">
          {shots.length === 0 ? <EmptyNodeContent text="分镜脚本尚未生成" /> : shots.slice(0, 6).map((shot) => (
            <div key={shot.id} className="rounded-md border border-base-200 p-2">
              <p className="text-xs font-semibold text-muted-foreground">镜头 {shot.order}</p>
              <p className="text-xs line-clamp-2 mt-1">{shot.description || shot.prompt}</p>
            </div>
          ))}
        </div>
      )}



      {selectedNode.id === "shotImages" && (
        <AssetStrip emptyText="镜头视频尚未生成" items={shots.map((s) => ({ id: s.id, title: `镜头 ${s.order}`, url: s.video_url || s.image_url || null }))} />
      )}

      {selectedNode.id === "output" && (
        <div className="rounded-md border border-base-200 p-3 text-sm">
          {projectVideoUrl ? (
            <a href={projectVideoUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">查看输出视频</a>
          ) : (
            <p className="text-muted-foreground">等待镜头画面和视频片段合成后输出。</p>
          )}
        </div>
      )}
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
  items: Array<{ id: number; title: string; url: string | null }>;
  emptyText: string;
}) {
  const visible = items.filter((item) => item.url);
  if (visible.length === 0) return <EmptyNodeContent text={emptyText} />;

  return (
    <div className="grid grid-cols-4 gap-2">
	      {visible.slice(0, 8).map((item) => (
	        <div key={item.id} className="rounded-md border border-base-200 overflow-hidden bg-base-100">
	          {isVideoUrl(item.url!) ? (
	            <video src={item.url!} className="h-20 w-full object-cover" controls />
	          ) : (
	            <img src={item.url!} alt={item.title} className="h-20 w-full object-cover" />
	          )}
	          <p className="text-xs px-2 py-1 truncate">{item.title}</p>
	        </div>
	      ))}
    </div>
  );
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|#|$)/i.test(url) || url.includes("/video");
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
