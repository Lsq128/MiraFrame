"use client";

import { useState, useCallback } from "react";
import type React from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { TopBar } from "@/components/layout/TopBar";
import { projectsApi } from "@/services/projectsApi";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import {
  ArrowUp,
  ChevronDown,
  Plus,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";

const STYLES: { slug: string; label: string; category: string; mood: string }[] = [
  // 2D Animation
  { slug: "anime", label: "日式动漫", category: "2D 动画", mood: "清透 / 高光" },
  { slug: "shonen", label: "热血少年", category: "2D 动画", mood: "速度线 / 爆发" },
  { slug: "slice-of-life", label: "日常系", category: "2D 动画", mood: "柔光 / 治愈" },
  { slug: "manga", label: "黑白漫画", category: "2D 动画", mood: "网点 / 线稿" },
  { slug: "donghua", label: "国风动画", category: "2D 动画", mood: "水墨 / 云气" },
  { slug: "guofeng-manga", label: "国风漫画", category: "2D 动画", mood: "卷轴 / 墨线" },
  // 3D Styles
  { slug: "cinematic", label: "电影级", category: "3D 风格", mood: "宽银幕 / 质感" },
  { slug: "pixar", label: "皮克斯", category: "3D 风格", mood: "圆润 / 明亮" },
  { slug: "cyberpunk", label: "赛博朋克", category: "3D 风格", mood: "霓虹 / 夜色" },
  { slug: "lowpoly", label: "低多边形", category: "3D 风格", mood: "几何 / 玩具感" },
  // Art Styles
  { slug: "watercolor", label: "水彩", category: "艺术风格", mood: "晕染 / 纸纹" },
  { slug: "fairy-tale", label: "童话", category: "艺术风格", mood: "梦境 / 暖光" },
  { slug: "sketch", label: "素描", category: "艺术风格", mood: "铅笔 / 草图" },
  { slug: "realistic", label: "写实", category: "艺术风格", mood: "自然光 / 细节" },
];

const STYLE_COVERS: Record<string, {
  bg: string;
  image: string;
  filter: string;
  figure: string;
  accent: string;
  panel: string;
  pattern: "spark" | "speed" | "soft" | "dots" | "ink" | "scroll" | "cinema" | "round" | "neon" | "poly" | "wash" | "dream" | "sketch" | "real";
}> = {
  anime: {
    bg: "linear-gradient(135deg,#ffd6e9 0%,#8fc7ff 54%,#fff1a8 100%)",
    image: "/style-covers/shot-2.png",
    filter: "saturate(1.12) brightness(1.06)",
    figure: "linear-gradient(160deg,#2f3a8f,#ff78b5)",
    accent: "#ffffff",
    panel: "rgba(255,255,255,.62)",
    pattern: "spark",
  },
  shonen: {
    bg: "linear-gradient(135deg,#ff3d3d 0%,#ffae00 48%,#201047 100%)",
    image: "/style-covers/shot-2.png",
    filter: "saturate(1.35) contrast(1.12) brightness(.95)",
    figure: "linear-gradient(160deg,#171123,#ffef5a)",
    accent: "#fff2a8",
    panel: "rgba(255,255,255,.42)",
    pattern: "speed",
  },
  "slice-of-life": {
    bg: "linear-gradient(145deg,#fff0c7 0%,#bfe8d4 54%,#f6b6c8 100%)",
    image: "/style-covers/shot-1.png",
    filter: "saturate(.92) brightness(1.12)",
    figure: "linear-gradient(160deg,#6b7bd8,#f59fbc)",
    accent: "#fffef7",
    panel: "rgba(255,255,255,.68)",
    pattern: "soft",
  },
  manga: {
    bg: "linear-gradient(135deg,#ffffff 0%,#e5e7eb 100%)",
    image: "/style-covers/shot-3.png",
    filter: "grayscale(1) contrast(1.28) brightness(1.08)",
    figure: "linear-gradient(160deg,#111827,#4b5563)",
    accent: "#111827",
    panel: "rgba(255,255,255,.74)",
    pattern: "dots",
  },
  donghua: {
    bg: "linear-gradient(145deg,#d9f0e2 0%,#88b8a5 48%,#3c5f7d 100%)",
    image: "/style-covers/shot-4.png",
    filter: "saturate(.82) sepia(.18) brightness(1.02)",
    figure: "linear-gradient(160deg,#213f47,#d9b36a)",
    accent: "#f7f1dc",
    panel: "rgba(255,255,255,.48)",
    pattern: "ink",
  },
  "guofeng-manga": {
    bg: "linear-gradient(135deg,#f6e0bf 0%,#b75b42 55%,#20233d 100%)",
    image: "/style-covers/shot-4.png",
    filter: "sepia(.32) saturate(.95) contrast(1.08)",
    figure: "linear-gradient(160deg,#2a1f1d,#f2c572)",
    accent: "#f7dfb8",
    panel: "rgba(255,248,230,.48)",
    pattern: "scroll",
  },
  cinematic: {
    bg: "linear-gradient(135deg,#111827 0%,#64748b 45%,#f59e0b 100%)",
    image: "/style-covers/shot-6.png",
    filter: "contrast(1.14) brightness(.84) saturate(.88)",
    figure: "linear-gradient(160deg,#050816,#d4af37)",
    accent: "#f8d27a",
    panel: "rgba(255,255,255,.32)",
    pattern: "cinema",
  },
  pixar: {
    bg: "linear-gradient(135deg,#ffd166 0%,#69dbff 48%,#8bd17c 100%)",
    image: "/style-covers/shot-2.png",
    filter: "saturate(1.22) brightness(1.08) contrast(.95)",
    figure: "linear-gradient(160deg,#4f46e5,#ff8fab)",
    accent: "#fff8d8",
    panel: "rgba(255,255,255,.58)",
    pattern: "round",
  },
  cyberpunk: {
    bg: "linear-gradient(135deg,#090b1f 0%,#9333ea 46%,#06b6d4 100%)",
    image: "/style-covers/shot-5.png",
    filter: "saturate(1.45) contrast(1.18) brightness(.78) hue-rotate(34deg)",
    figure: "linear-gradient(160deg,#111827,#22d3ee)",
    accent: "#f0abfc",
    panel: "rgba(255,255,255,.22)",
    pattern: "neon",
  },
  lowpoly: {
    bg: "linear-gradient(45deg,#94a3b8 0%,#f97316 45%,#22c55e 100%)",
    image: "/style-covers/shot-3.png",
    filter: "saturate(.9) contrast(1.05)",
    figure: "linear-gradient(160deg,#1f2937,#fbbf24)",
    accent: "#e2e8f0",
    panel: "rgba(255,255,255,.42)",
    pattern: "poly",
  },
  watercolor: {
    bg: "linear-gradient(135deg,#fffaf0 0%,#dcefff 100%)",
    image: "/style-covers/shot-1.png",
    filter: "saturate(.78) brightness(1.16) contrast(.86)",
    figure: "linear-gradient(160deg,#60a5fa,#fb7185)",
    accent: "#ffffff",
    panel: "rgba(255,255,255,.62)",
    pattern: "wash",
  },
  "fairy-tale": {
    bg: "linear-gradient(145deg,#ffe8a3 0%,#d8b4fe 50%,#9be7c7 100%)",
    image: "/style-covers/shot-6.png",
    filter: "saturate(1.08) brightness(1.1) hue-rotate(-10deg)",
    figure: "linear-gradient(160deg,#7c3aed,#f9a8d4)",
    accent: "#fff7c7",
    panel: "rgba(255,255,255,.54)",
    pattern: "dream",
  },
  sketch: {
    bg: "linear-gradient(135deg,#f8fafc 0%,#cbd5e1 100%)",
    image: "/style-covers/shot-3.png",
    filter: "grayscale(1) contrast(1.45) brightness(1.16)",
    figure: "linear-gradient(160deg,#334155,#0f172a)",
    accent: "#475569",
    panel: "rgba(255,255,255,.62)",
    pattern: "sketch",
  },
  realistic: {
    bg: "linear-gradient(135deg,#293241 0%,#8d99ae 42%,#e9c46a 100%)",
    image: "/style-covers/shot-5.png",
    filter: "saturate(.82) contrast(1.06) brightness(.96)",
    figure: "linear-gradient(160deg,#111827,#d6a55d)",
    accent: "#f5d99d",
    panel: "rgba(255,255,255,.34)",
    pattern: "real",
  },
};

export default function HomePage() {
  const navigate = useNavigate();

  const [story, setStory] = useState("");
  const [style, setStyle] = useState("anime");
  const [shotCount, setShotCount] = useState(6);
  const [characterHints, setCharacterHints] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  const createMutation = useMutation({
    mutationFn: async () => {
      const title = story.split("\n")[0].trim().slice(0, 50) || "未命名项目";
      return projectsApi.create({
        title,
        story,
        style,
        target_shot_count: shotCount || undefined,
        character_hints: characterHints.filter((h) => h.trim()),
      });
    },
    onSuccess: (project) => {
      navigate(`/project/${project.id}?autoStart=true`);
    },
  });

  const handleSubmit = useCallback(() => {
    if (!story.trim()) return;
    createMutation.mutate();
  }, [story, createMutation]);

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
    <div className="min-h-screen bg-base-100">
      <TopBar />

      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        <section className="min-w-0">
          <div className="mb-5">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-primary/15 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                {BRAND.fullName}
              </div>
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{BRAND.tagline}</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{BRAND.description}</p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-brutal p-4 sm:p-5">
          {/* Story textarea */}
          <div className="relative">
            <textarea
              className="textarea textarea-bordered w-full resize-none text-base leading-7"
              rows={8}
              maxLength={5000}
              placeholder="把这一幕交给弥镜：角色是谁，冲突在哪，镜头想怎么燃、怎么甜、怎么收尾。写下几句也可以，我会先拆成大纲，再把它推进成角色、分镜、镜头画面和成片。"
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
              className="absolute bottom-3 right-3 btn btn-primary rounded-md px-4 py-2 text-sm shadow-[0_12px_28px_rgba(37,99,235,.28)]"
              aria-label="创建项目"
            >
              {createMutation.isPending ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <>
                  <span>生成漫剧</span>
                  <ArrowUp className="h-4 w-4" />
                </>
              )}
            </button>
          </div>

          {/* Style selector */}
          <div className="mt-5 rounded-lg border border-base-300 bg-base-200/40 p-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">风格谱系</p>
                <p className="text-xs text-muted-foreground">选一张画风封面，后续角色和镜头会沿用这个基调。</p>
              </div>
              <span className="rounded-md bg-base-100 px-2 py-1 text-xs text-muted-foreground">{STYLES.find((s) => s.slug === style)?.label}</span>
            </div>
            <div className="space-y-4">
            {categories.map((category) => (
              <div key={category}>
                <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">{category}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {STYLES.filter((s) => s.category === category).map((s) => (
                    <button
                      key={s.slug}
                      onClick={() => setStyle(s.slug)}
                      className={cn(
                        "group overflow-hidden rounded-md border bg-base-100 text-left transition-all",
                        style === s.slug
                          ? "border-primary shadow-[0_0_0_2px_rgba(37,99,235,.12),0_14px_28px_rgba(23,32,51,.12)]"
                          : "border-base-300 hover:border-primary/40 hover:shadow-md",
                      )}
                    >
                      <StyleCover slug={s.slug} active={style === s.slug} />
                      <span className="block p-2">
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{s.label}</span>
                          <span className={cn(
                            "h-2 w-2 rounded-full",
                            style === s.slug ? "bg-primary" : "bg-base-300 group-hover:bg-primary/50",
                          )} />
                        </span>
                        <span className="mt-1 block text-[11px] text-muted-foreground">{s.mood}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            </div>
          </div>

          {/* Advanced options toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="mt-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-base-content transition-colors"
          >
            <SlidersHorizontal className="h-4 w-4" />
            更多选项
            <ChevronDown className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")} />
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
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {characterHints.length < 6 && (
                  <button
                    onClick={addCharacterHint}
                    className="btn btn-ghost btn-xs mt-2"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    添加角色提示
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
        </section>
      </main>
    </div>
  );
}

function StyleCover({ slug, active }: { slug: string; active: boolean }) {
  const cover = STYLE_COVERS[slug] || STYLE_COVERS.anime;

  return (
    <span
      className="relative block h-24 w-full overflow-hidden border-b border-base-300"
      style={{ background: cover.bg }}
    >
      <span
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: `url(${cover.image})`,
          filter: cover.filter,
          transform: "scale(1.04)",
        }}
      />
      <span
        className="absolute inset-0 mix-blend-multiply opacity-45"
        style={{ background: cover.bg }}
      />
      <span className="absolute inset-0 opacity-65" style={patternStyle(cover.pattern, cover.accent)} />
      <span className="absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-black/58 to-transparent" />
      <span className="absolute left-2 top-2 h-[calc(100%-16px)] w-[calc(100%-16px)] rounded-sm border border-white/42 shadow-[inset_0_0_0_1px_rgba(0,0,0,.12)]" />
      <span className="absolute left-3 top-3 h-4 w-9 rounded-full border border-black/10 bg-white/76" />
      <span className="absolute left-6 top-[24px] h-2 w-2 rotate-45 bg-white/76" />
      <span className="absolute bottom-2 left-3 h-4 w-16 rounded-sm bg-black/46" />
      <span className="absolute bottom-[15px] left-5 h-0.5 w-9 bg-white/72" />
      <span className="absolute bottom-[10px] left-5 h-0.5 w-6 bg-white/58" />
      <span className="absolute right-2 top-2 rounded-full bg-black/46 px-2 py-0.5 text-[10px] text-white shadow-sm">
        {active ? "当前" : "预览"}
      </span>
    </span>
  );
}

function patternStyle(pattern: string, accent: string): React.CSSProperties {
  if (pattern === "speed") {
    return {
      background: `repeating-linear-gradient(115deg, rgba(255,255,255,.35) 0 4px, transparent 4px 13px), radial-gradient(circle at 25% 78%, ${accent} 0 3px, transparent 4px)`,
    };
  }
  if (pattern === "dots") {
    return {
      background: "radial-gradient(circle, rgba(15,23,42,.32) 1px, transparent 1.8px)",
      backgroundSize: "9px 9px",
    };
  }
  if (pattern === "ink" || pattern === "wash") {
    return {
      background: `radial-gradient(ellipse at 30% 35%, ${accent}99 0 18%, transparent 19%), radial-gradient(ellipse at 68% 58%, rgba(255,255,255,.35) 0 16%, transparent 17%)`,
      filter: "blur(.2px)",
    };
  }
  if (pattern === "scroll") {
    return {
      background: "repeating-linear-gradient(90deg, rgba(91,51,26,.22) 0 1px, transparent 1px 12px)",
    };
  }
  if (pattern === "cinema") {
    return {
      background: "linear-gradient(0deg, rgba(0,0,0,.45) 0 14%, transparent 15% 82%, rgba(0,0,0,.45) 83% 100%)",
    };
  }
  if (pattern === "neon") {
    return {
      background: `repeating-linear-gradient(0deg, rgba(255,255,255,.1) 0 1px, transparent 1px 8px), linear-gradient(90deg, transparent, ${accent}66, transparent)`,
    };
  }
  if (pattern === "poly") {
    return {
      background: "linear-gradient(135deg, transparent 0 44%, rgba(255,255,255,.28) 45% 55%, transparent 56%), linear-gradient(45deg, transparent 0 54%, rgba(0,0,0,.12) 55% 62%, transparent 63%)",
    };
  }
  if (pattern === "sketch") {
    return {
      background: "repeating-linear-gradient(145deg, rgba(15,23,42,.24) 0 1px, transparent 1px 7px)",
    };
  }
  if (pattern === "dream" || pattern === "spark") {
    return {
      background: `radial-gradient(circle at 72% 24%, rgba(255,255,255,.92) 0 8%, transparent 9%), radial-gradient(circle at 22% 62%, ${accent}aa 0 5%, transparent 6%)`,
    };
  }
  if (pattern === "round" || pattern === "soft") {
    return {
      background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,.84) 0 12%, transparent 13%), radial-gradient(circle at 72% 64%, rgba(255,255,255,.36) 0 16%, transparent 17%)",
    };
  }
  return {
    background: `radial-gradient(circle at 68% 20%, ${accent}aa 0 9%, transparent 10%), linear-gradient(0deg, rgba(255,255,255,.18), transparent)`,
  };
}
