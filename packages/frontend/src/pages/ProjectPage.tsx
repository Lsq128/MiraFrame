"use client";

import { forwardRef, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Download,
  FileText,
  Film,
  Image,
  Play,
  RefreshCw,
  Users,
} from "lucide-react";
import { TopBar } from "@/components/layout/TopBar";
import { StagePipeline } from "@/components/layout/StagePipeline";
import { ChatDrawer } from "@/components/chat/ChatDrawer";
import { NodeDetail } from "@/components/project/NodeDetail";
import { WorkflowStatusBadge } from "@/components/project/WorkflowStatusBadge";
import { useProjectStore } from "@/stores/projectStore";
import { useCharacterStore } from "@/stores/characterStore";
import { useShotStore } from "@/stores/shotStore";
import { useRunStore } from "@/stores/runStore";
import { useMessageStore } from "@/stores/messageStore";
import { useChatPanelStore } from "@/stores/chatPanelStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useProjectWorkspaceData } from "@/hooks/useProjectWorkspaceData";
import { useWorkflowNodeSelection } from "@/hooks/useWorkflowNodeSelection";
import { projectsApi } from "@/services/projectsApi";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import type { ProjectRevisionPayload } from "@/types";
import {
  buildMaterialStages,
  getOutlineActs,
  getOutlineLogline,
  isFinalVideoUrl,
  isInternalCompositionUrl,
  isPlayableVideoUrl,
  isTaskVideoUrl,
  nodeIdForStage,
  stageForRevision,
  type WorkflowNode,
} from "@/utils/projectWorkflow";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const projectId = id ? parseInt(id) : null;

  // ── State from Zustand stores ──
  // IMPORTANT: each field needs its own selector, or use useShallow.
  // Returning a new object { a, b } from a selector causes infinite loops.
  const clearProject = useProjectStore((s) => s.clearProject);
  const clearCharacters = useCharacterStore((s) => s.clearCharacters);
  const clearShots = useShotStore((s) => s.clearShots);
  const clearMessages = useMessageStore((s) => s.clearMessages);

  // Subscriptions for rendering (single-value selectors are safe)
  const projectTitle = useProjectStore((s) => s.projectTitle);
  const isGenerating = useRunStore((s) => s.isGenerating);
  const currentStage = useRunStore((s) => s.currentStage);
  const currentRunId = useRunStore((s) => s.currentRunId);
  const awaitingConfirm = useRunStore((s) => s.awaitingConfirm);
  const awaitingAgent = useRunStore((s) => s.awaitingAgent);
  const recoveryControl = useRunStore((s) => s.recoveryControl);
  const runError = useRunStore((s) => s.error);
  const projectVideoUrl = useProjectStore((s) => s.projectVideoUrl);
  const storyOutline = useProjectStore((s) => s.projectStoryOutline);
  const outlineApproved = useProjectStore((s) => s.projectOutlineApproved);
  const characters = useCharacterStore((s) => s.characters);
  const shots = useShotStore((s) => s.shots);
  const setGenerating = useRunStore((s) => s.setGenerating);
  const setCurrentStage = useRunStore((s) => s.setCurrentStage);
  const setCurrentRunId = useRunStore((s) => s.setCurrentRunId);
  const setAwaitingConfirm = useRunStore((s) => s.setAwaitingConfirm);
  const resetRunState = useRunStore((s) => s.resetRunState);
  const setProjectOutlineApproved = useProjectStore((s) => s.setProjectOutlineApproved);

  // Local UI
  const autoStartTriggered = useRef(false);
  const generateRequestToken = useRef(0);
  const openChatPanel = useChatPanelStore((s) => s.open);

  // WebSocket — always connected
  useWebSocket(projectId);

  const { projectQuery, latestRunQuery } = useProjectWorkspaceData(projectId, isGenerating);

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

  const revisionMutation = useMutation({
    mutationFn: (payload: ProjectRevisionPayload) => projectsApi.submitRevision(projectId!, payload),
    onSuccess: (data, payload) => {
      if (data.run_id) setCurrentRunId(data.run_id);
      setGenerating(true);
      setCurrentStage(stageForRevision(payload.entity_type));
      openChatPanel();
      queryClient.invalidateQueries({ queryKey: ["project", projectId, "messages"] });
    },
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

  const handleSubmitRevision = useCallback((payload: ProjectRevisionPayload) => {
    revisionMutation.mutate(payload);
  }, [revisionMutation]);

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
  const latestRunError = runError || latestRunQuery.data?.error || null;
  const topStages = buildMaterialStages({
    currentStage,
    isGenerating,
    awaitingConfirm,
    awaitingAgent,
    outline: storyOutline as unknown as Record<string, unknown> | null,
    outlineApproved,
    characters,
    shots,
    projectVideoUrl,
    latestRunError,
  });

  return (
    <div className="h-screen flex flex-col bg-base-100">
      <TopBar />
      <StagePipeline currentStage={currentStage} isGenerating={isGenerating} awaitingConfirm={awaitingConfirm} hasRecovery={hasRecovery} onResume={() => {}} onCancel={handleCancel} stages={topStages} />
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
          latestRunError={latestRunError}
          onSubmitRevision={handleSubmitRevision}
          isSubmittingRevision={revisionMutation.isPending}
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
  onSubmitRevision,
  isSubmittingRevision,
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
  onSubmitRevision: (payload: ProjectRevisionPayload) => void;
  isSubmittingRevision: boolean;
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
  const hasCharacterImages = characters.length > 0 && characters.every((c) => !!c.image_url);
  const characterImageCount = characters.filter((c) => !!c.image_url).length;
  const hasPartialCharacters = characters.length > 0 && characterImageCount < characters.length;
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
        : hasPartialCharacters && !isGenerating
          ? "error"
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
  ];

  const { selectedNode, setSelectedNodeId, nodeRefs } = useWorkflowNodeSelection({
    nodes,
    activeNodeId,
    isGenerating,
    awaitingConfirm,
  });

  if (!selectedNode) return null;

  return (
    <div className="flex-1 overflow-hidden bg-background">
      <div className="h-full flex flex-col">
        <div className="min-h-14 shrink-0 border-b border-base-300 bg-base-100 px-4 py-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{projectTitle || BRAND.fullName}</p>
            <p className="text-xs text-muted-foreground">{BRAND.cnName} 项目工作台</p>
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

        <div className="flex-1 min-h-0 grid grid-cols-1 grid-rows-[minmax(320px,0.9fr)_minmax(360px,1.1fr)] xl:grid-cols-[minmax(620px,1fr)_520px] xl:grid-rows-1 overflow-hidden">
          <div className="relative overflow-auto halftone-bg">
            <div className="relative min-h-[620px] min-w-[720px] p-8">
              <WorkflowConnectors />
              <div className="grid grid-cols-2 gap-x-12 gap-y-8 relative z-10 max-w-[720px]">
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

          <aside className="border-t xl:border-t-0 xl:border-l border-base-300 bg-base-100 overflow-y-auto">
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
              latestRunError={latestRunError}
              taskVideoCount={taskVideoCount}
              onRetryMaterials={onRetryMaterials}
              onConfirm={onConfirm}
              onSubmitRevision={onSubmitRevision}
              isSubmittingRevision={isSubmittingRevision}
            />
          </aside>
        </div>
      </div>
    </div>
  );
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
  const shouldOffset = index % 2 === 1;

  return (
    <button
      ref={ref}
      onClick={onSelect}
      className={cn(
        "min-h-[156px] text-left rounded-lg border bg-base-100 p-4 transition-all relative shadow-sm",
        shouldOffset && "translate-y-6",
        selected ? "border-primary shadow-[0_0_0_3px_rgba(59,130,246,0.12),0_16px_34px_rgba(15,23,42,0.08)]" : "border-base-300 hover:border-primary/40 hover:shadow-md",
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
        <WorkflowStatusBadge status={node.status} />
      </div>
      <div className="mt-4 pr-1">
        <p className="text-sm font-semibold">{node.label}</p>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{node.description}</p>
      </div>
      <div className="mt-4 text-xs font-medium text-base-content">{node.metric}</div>
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
      <path d="M270 108 C350 108, 350 128, 430 128" stroke="#cbd5e1" strokeWidth="2" fill="none" markerEnd="url(#workflow-arrow)" />
      <path d="M430 250 C350 300, 350 300, 270 350" stroke="#cbd5e1" strokeWidth="2" fill="none" markerEnd="url(#workflow-arrow)" />
      <path d="M270 350 C350 350, 350 370, 430 370" stroke="#cbd5e1" strokeWidth="2" fill="none" markerEnd="url(#workflow-arrow)" />
      <path d="M430 490 C350 545, 270 545, 190 555" stroke="#cbd5e1" strokeWidth="2" fill="none" markerEnd="url(#workflow-arrow)" />
    </svg>
  );
}
