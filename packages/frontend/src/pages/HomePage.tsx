"use client";

import { useState, useRef, useCallback, type DragEvent, type ClipboardEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/TopBar";
import { projectsApi } from "@/services/projectsApi";
import { cn } from "@/lib/utils";

const STYLES: { slug: string; label: string; category: string }[] = [
  // 2D Animation
  { slug: "anime", label: "日式动漫", category: "2D 动画" },
  { slug: "shonen", label: "热血少年", category: "2D 动画" },
  { slug: "slice-of-life", label: "日常系", category: "2D 动画" },
  { slug: "manga", label: "黑白漫画", category: "2D 动画" },
  { slug: "donghua", label: "国风动画", category: "2D 动画" },
  { slug: "guofeng-manga", label: "国风漫画", category: "2D 动画" },
  // 3D Styles
  { slug: "cinematic", label: "电影级", category: "3D 风格" },
  { slug: "pixar", label: "皮克斯", category: "3D 风格" },
  { slug: "cyberpunk", label: "赛博朋克", category: "3D 风格" },
  { slug: "lowpoly", label: "低多边形", category: "3D 风格" },
  // Art Styles
  { slug: "watercolor", label: "水彩", category: "艺术风格" },
  { slug: "fairy-tale", label: "童话", category: "艺术风格" },
  { slug: "sketch", label: "素描", category: "艺术风格" },
  { slug: "realistic", label: "写实", category: "艺术风格" },
];

const MAX_REFERENCE_IMAGES = 7;

export default function HomePage() {
  const navigate = useNavigate();

  const [story, setStory] = useState("");
  const [style, setStyle] = useState("anime");
  const [shotCount, setShotCount] = useState(6);
  const [characterHints, setCharacterHints] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [assetsOpen, setAssetsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const createMutation = useMutation({
    mutationFn: async () => {
      const title = story.split("\n")[0].trim().slice(0, 50) || "未命名项目";
      const project = await projectsApi.create({
        title,
        story,
        style,
        target_shot_count: shotCount || undefined,
        character_hints: characterHints.filter((h) => h.trim()),
      });
      // Upload reference images sequentially
      for (const file of pendingFiles) {
        await projectsApi.uploadReference(project.id, file);
      }
      return project;
    },
    onSuccess: (project) => {
      navigate(`/project/${project.id}?autoStart=true`);
    },
  });

  const handleSubmit = useCallback(() => {
    if (!story.trim()) return;
    createMutation.mutate();
  }, [story, createMutation]);

  // Reference image handlers
  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const remaining = MAX_REFERENCE_IMAGES - referenceImages.length;
      if (remaining <= 0) return;

      const toAdd = Array.from(files).slice(0, remaining);
      setPendingFiles((prev) => [...prev, ...toAdd]);

      for (const file of toAdd) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setReferenceImages((prev) => [...prev, e.target?.result as string]);
        };
        reader.readAsDataURL(file);
      }
    },
    [referenceImages.length],
  );

  const removeImage = useCallback((index: number) => {
    setReferenceImages((prev) => prev.filter((_, i) => i !== index));
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) handleFiles(files);
    },
    [handleFiles],
  );

  const addCharacterHint = () => {
    if (characterHints.length < 6) {
      setCharacterHints([...characterHints, ""]);
    }
  };

  const updateCharacterHint = (index: number, value: string) => {
    const updated = [...characterHints];
    updated[index] = value;
    setCharacterHints(updated);
  };

  const removeCharacterHint = (index: number) => {
    setCharacterHints(characterHints.filter((_, i) => i !== index));
  };

  // Group styles by category
  const categories = [...new Set(STYLES.map((s) => s.category))];

  return (
    <div
      className="min-h-screen bg-base-100"
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onPaste={handlePaste}
    >
      <TopBar
        onToggleAssets={() => setAssetsOpen(!assetsOpen)}
        onToggleHistory={() => setHistoryOpen(!historyOpen)}
        assetsOpen={assetsOpen}
        historyOpen={historyOpen}
      />

      {/* Asset Drawer placeholder */}
      {assetsOpen && (
        <div className="fixed right-0 top-10 z-40 w-80 h-[calc(100vh-2.5rem)] bg-base-100 border-l shadow-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">资产库</h3>
            <button onClick={() => setAssetsOpen(false)} className="btn btn-xs btn-ghost">
              ✕
            </button>
          </div>
          <p className="text-sm text-muted-foreground">暂无资产</p>
        </div>
      )}

      {/* History Drawer placeholder */}
      {historyOpen && (
        <div className="fixed right-0 top-10 z-40 w-80 h-[calc(100vh-2.5rem)] bg-base-100 border-l shadow-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">项目历史</h3>
            <button onClick={() => setHistoryOpen(false)} className="btn btn-xs btn-ghost">
              ✕
            </button>
          </div>
          <p className="text-sm text-muted-foreground">暂无历史项目</p>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-4 pt-16 pb-32">
        {/* Hero */}
        <div className="text-center mb-8">
          <h1 className="text-6xl sm:text-8xl font-comic font-bold text-primary mb-2">
            openOii
          </h1>
          <p className="text-lg text-muted-foreground">用 AI 将故事转化为漫剧视频</p>
          <Link
            to="/universes"
            className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1 mt-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            IP 宇宙
          </Link>
        </div>

        {/* Main card */}
        <div className="card bg-base-200 border-2 border-primary/20 rounded-2xl shadow-brutal p-6">
          {/* Story textarea */}
          <div className="relative">
            <textarea
              className="textarea textarea-bordered w-full text-base resize-none"
              rows={4}
              maxLength={5000}
              placeholder="在这里写下你的故事想法，AI 会自动为你生成漫剧..."
              value={story}
              onChange={(e) => setStory(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !isComposing) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            {/* Character counter */}
            {story.length > 4500 && (
              <span className="absolute bottom-2 left-3 text-xs bg-base-100/90 px-2 py-0.5 rounded-full">
                {story.length}/5000
              </span>
            )}
            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={!story.trim() || createMutation.isPending}
              className="absolute bottom-3 right-3 btn btn-circle btn-primary btn-sm shadow-lg"
              aria-label="创建项目"
            >
              {createMutation.isPending ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
            </button>
          </div>

          {/* Reference images */}
          <div className="flex flex-wrap gap-2 mt-3">
            {referenceImages.map((url, i) => (
              <div key={i} className="relative group">
                <img
                  src={url}
                  alt={`参考图 ${i + 1}`}
                  className="w-12 h-12 object-cover rounded-lg border border-base-300"
                />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-error text-error-content rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`删除参考图 ${i + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
            {referenceImages.length < MAX_REFERENCE_IMAGES && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-12 h-12 border-2 border-dashed border-base-300 rounded-lg flex items-center justify-center text-base-content/40 hover:border-primary hover:text-primary transition-colors"
                aria-label="添加参考图片"
              >
                +
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {/* Style selector */}
          <div className="mt-4 space-y-3">
            {categories.map((category) => (
              <div key={category}>
                <p className="text-xs text-muted-foreground mb-2">{category}</p>
                <div className="flex flex-wrap gap-1.5">
                  {STYLES.filter((s) => s.category === category).map((s) => (
                    <button
                      key={s.slug}
                      onClick={() => setStyle(s.slug)}
                      className={cn(
                        "px-3 py-1.5 text-sm rounded-full border transition-all",
                        style === s.slug
                          ? "bg-primary text-primary-content border-primary shadow-md -translate-y-0.5"
                          : "bg-base-100 border-base-300 hover:border-primary/50",
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Advanced options toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="mt-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-base-content transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            更多选项
          </button>

          {showAdvanced && (
            <div className="mt-3 space-y-4 p-4 bg-base-100 rounded-xl border border-base-300">
              {/* Shot count */}
              <div>
                <label className="text-sm font-medium mb-1 block">
                  分镜数量: <span className="text-primary font-bold">{shotCount || "默认"}</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={shotCount}
                  onChange={(e) => setShotCount(Number(e.target.value))}
                  className="range range-primary range-sm w-full"
                />
              </div>

              {/* Character hints */}
              <div>
                <label className="text-sm font-medium mb-2 block">角色提示</label>
                <div className="space-y-2">
                  {characterHints.map((hint, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        className="input input-bordered input-sm flex-1"
                        placeholder={`角色 ${i + 1}`}
                        value={hint}
                        onChange={(e) => updateCharacterHint(i, e.target.value)}
                      />
                      <button
                        onClick={() => removeCharacterHint(i)}
                        className="btn btn-ghost btn-xs text-error"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                {characterHints.length < 6 && (
                  <button
                    onClick={addCharacterHint}
                    className="btn btn-ghost btn-xs mt-2"
                  >
                    + 添加角色提示
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Error message */}
          {createMutation.isError && (
            <div className="alert alert-error mt-4">
              <span>创建失败: {(createMutation.error as Error)?.message || "请重试"}</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
