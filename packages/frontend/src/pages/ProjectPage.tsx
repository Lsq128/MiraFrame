import { useParams } from "react-router-dom";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useProjectStore } from "@/stores/projectStore";
import { useRunStore } from "@/stores/runStore";
import { useCharacterStore } from "@/stores/characterStore";
import { useShotStore } from "@/stores/shotStore";
import { generationApi } from "@/services";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PHASE2_STAGES } from "@openoii/shared";

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const projectId = id ?? null;
  useWebSocket(projectId);

  const { project } = useProjectStore();
  const {
    isGenerating,
    currentStage,
    progress,
    awaitingConfirm,
    currentRunId,
  } = useRunStore();
  const { characters } = useCharacterStore();
  const { shots } = useShotStore();

  const handleGenerate = async () => {
    if (!projectId) return;
    try {
      await generationApi.generate(projectId);
    } catch (error) {
      console.error("Generate failed:", error);
    }
  };

  const handleConfirm = async () => {
    if (!projectId || !currentRunId) return;
    await generationApi.resume(projectId, currentRunId, true);
  };

  const handleCancel = async () => {
    if (!projectId || !currentRunId) return;
    await generationApi.cancel(projectId, currentRunId);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Bar */}
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-semibold">
          {project?.title || "Loading..."}
        </h1>
        <div className="flex gap-2">
          {!isGenerating ? (
            <Button onClick={handleGenerate}>开始生成</Button>
          ) : awaitingConfirm ? (
            <>
              <Button variant="outline" onClick={handleCancel}>
                拒绝
              </Button>
              <Button onClick={handleConfirm}>确认</Button>
            </>
          ) : (
            <Button variant="destructive" onClick={handleCancel}>
              取消
            </Button>
          )}
        </div>
      </header>

      {/* Pipeline Progress */}
      {isGenerating && (
        <div className="bg-accent/50 px-4 py-2">
          <div className="flex items-center gap-4 max-w-4xl mx-auto">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium">
              {Math.round(progress * 100)}%
            </span>
            <span className="text-sm text-muted-foreground">
              {currentStage}
            </span>
          </div>
        </div>
      )}

      {/* Stage Pipeline */}
      <div className="flex-1 p-4">
        <div className="flex flex-wrap gap-2 mb-6">
          {PHASE2_STAGES.map((stage) => (
            <div
              key={stage}
              className={`px-3 py-1 rounded-full text-xs font-medium border ${
                stage === currentStage
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-muted-foreground"
              }`}
            >
              {stage}
            </div>
          ))}
        </div>

        {/* Characters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {characters.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-3">
                <p className="font-medium text-sm">{c.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {c.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Shots */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {shots.map((s) => (
            <Card key={s.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-muted-foreground">
                    #{s.order}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {s.camera}
                  </span>
                </div>
                <p className="text-sm line-clamp-3">{s.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
