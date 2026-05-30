import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { projectApi } from "@/services";

export default function HomePage() {
  const [story, setStory] = useState("");
  const [title, setTitle] = useState("");
  const navigate = useNavigate();

  const handleCreate = async () => {
    if (!title.trim()) return;
    try {
      const project = await projectApi.create({
        title,
        story: story || undefined,
        style: "anime",
      });
      navigate(`/projects/${project.id}`);
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-accent/20 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl">openOii</CardTitle>
          <p className="text-center text-muted-foreground text-sm">
            故事创意 → AI 多 Agent 协作 → 漫画/视频
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="项目标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            placeholder="用一句话描述你的故事..."
            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            value={story}
            onChange={(e) => setStory(e.target.value)}
          />
          <Button
            className="w-full"
            size="lg"
            onClick={handleCreate}
            disabled={!title.trim()}
          >
            开始创作
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
