"use client";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { projectsApi } from "@/services/projectsApi";
import { universesApi } from "@/services/universesApi";
import { styleTemplatesApi } from "@/services/styleTemplatesApi";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import type { CreateProjectPayload, ProjectProviderOverridesPayload } from "@/types";

type ProviderKey = string | null;

interface FormData {
  title: string;
  story: string;
  style: string;
  text_provider_override: ProviderKey;
  image_provider_override: ProviderKey;
  video_provider_override: ProviderKey;
  universe_id: number | null;
}

const STYLES: { slug: string; label: string; category: string }[] = [
  { slug: "anime", label: "日式动漫", category: "2D 动画" },
  { slug: "shonen", label: "热血少年", category: "2D 动画" },
  { slug: "slice-of-life", label: "日常系", category: "2D 动画" },
  { slug: "manga", label: "黑白漫画", category: "2D 动画" },
  { slug: "donghua", label: "国风动画", category: "2D 动画" },
  { slug: "guofeng-manga", label: "国风漫画", category: "2D 动画" },
  { slug: "cinematic", label: "电影级", category: "3D 风格" },
  { slug: "pixar", label: "皮克斯", category: "3D 风格" },
  { slug: "cyberpunk", label: "赛博朋克", category: "3D 风格" },
  { slug: "lowpoly", label: "低多边形", category: "3D 风格" },
  { slug: "watercolor", label: "水彩", category: "艺术风格" },
  { slug: "fairy-tale", label: "童话", category: "艺术风格" },
  { slug: "sketch", label: "素描", category: "艺术风格" },
  { slug: "realistic", label: "写实", category: "艺术风格" },
];

const PROVIDER_OPTIONS = ["inherit-default", "anthropic", "openai", "fake"] as const;

function getProviderLabel(key: string): string {
  const map: Record<string, string> = {
    anthropic: "Anthropic",
    openai: "OpenAI",
    doubao: "Doubao",
    fake: "Fake（本地测试）",
    "inherit-default": "继承默认",
  };
  return map[key] || key;
}

export default function NewProjectPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    title: "",
    story: "",
    style: "cinematic",
    text_provider_override: null,
    image_provider_override: null,
    video_provider_override: null,
    universe_id: null,
  });

  const { data: universes } = useQuery({
    queryKey: ["universes"],
    queryFn: () => universesApi.list(),
  });

  const { data: styleTemplates } = useQuery({
    queryKey: ["style-templates"],
    queryFn: () => styleTemplatesApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: () => projectsApi.create(form as CreateProjectPayload),
    onSuccess: (project) => {
      navigate(`/project/${project.id}?autoStart=true`);
    },
  });

  const updateForm = (patch: Partial<FormData>) => setForm((f) => ({ ...f, ...patch }));

  const categories = [...new Set(STYLES.map((s) => s.category))];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-12 border-b border-base-300 bg-base-100">
        <Link to="/" className="text-sm text-muted-foreground hover:text-base-content flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" />
          返回
        </Link>
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </span>
          {BRAND.name}
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                  step > s ? "bg-success text-success-content" : step === s ? "bg-primary text-primary-foreground" : "bg-base-300 text-muted-foreground",
                )}
              >
                {step > s ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && <div className={cn("w-8 h-0.5", step > s ? "bg-success" : "bg-base-300")} />}
            </div>
          ))}
        </div>

        {/* Step 1: Story */}
        {step === 1 && (
          <div className="card p-6 space-y-4">
            <h2 className="text-xl font-bold">故事</h2>
            <div>
              <label className="text-sm font-medium block mb-1">项目标题 *</label>
              <input
                className="input input-bordered"
                placeholder="给你的项目起个名字"
                value={form.title}
                onChange={(e) => updateForm({ title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">故事内容</label>
              <textarea
                className="textarea textarea-bordered"
                rows={8}
                placeholder="很久很久以前..."
                value={form.story}
                onChange={(e) => updateForm({ story: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">关联宇宙（可选）</label>
              <select
                className="select"
                value={form.universe_id ?? ""}
                onChange={(e) => updateForm({ universe_id: e.target.value ? parseInt(e.target.value) : null })}
              >
                <option value="">不关联宇宙</option>
                {universes?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.projects_count} 章 / {u.shared_characters_count} 角色)
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">选择宇宙后，角色会自动从共享角色库导入</p>
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!form.title.trim()}
              className="btn btn-primary w-full"
            >
              下一步 →
            </button>
          </div>
        )}

        {/* Step 2: Style */}
        {step === 2 && (
          <div className="card p-6 space-y-6">
            <h2 className="text-xl font-bold">风格</h2>

            {/* Style templates */}
            <div className="space-y-4">
              {categories.map((category) => (
                <div key={category}>
                  <p className="text-xs text-muted-foreground mb-2">{category}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {STYLES.filter((s) => s.category === category).map((s) => (
                      <button
                        key={s.slug}
                        onClick={() => updateForm({ style: s.slug })}
                        className={cn(
                          "px-3 py-1.5 text-sm rounded-full border transition-all",
                          form.style === s.slug
                          ? "bg-primary text-primary-foreground border-primary shadow-md -translate-y-0.5"
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

            {/* Provider overrides */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">服务商覆盖（可选）</h3>
              {(["text", "image", "video"] as const).map((modality) => (
                <div key={modality}>
                  <label className="text-xs font-medium capitalize block mb-1">
                    {modality === "text" ? "文本生成" : modality === "image" ? "图像生成" : "视频生成"}
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {PROVIDER_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          const key = `${modality}_provider_override` as keyof FormData;
                          updateForm({ [key]: opt === "inherit-default" ? null : opt } as Partial<FormData>);
                        }}
                        className={cn(
                          "px-2 py-1 text-xs rounded border transition-colors",
                          (form[`${modality}_provider_override` as keyof FormData] ?? null) === (opt === "inherit-default" ? null : opt)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-base-200 border-base-300 hover:border-primary/50",
                        )}
                      >
                        {getProviderLabel(opt)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="btn btn-ghost flex-1">
                ← 返回
              </button>
              <button onClick={() => setStep(3)} className="btn btn-primary flex-1">
                下一步 →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 3 && (
          <div className="card p-6 space-y-4">
            <h2 className="text-xl font-bold">确认</h2>
            <div className="space-y-2">
              <h3 className="text-lg font-bold">{form.title || "未命名项目"}</h3>
              <span className="badge badge-primary badge-sm">{form.style}</span>
              {form.universe_id && <span className="badge badge-outline badge-sm ml-2">宇宙 #{form.universe_id}</span>}
              {form.story && <p className="text-sm text-muted-foreground line-clamp-4 mt-2">{form.story}</p>}
            </div>

            {/* Provider summary */}
            <div className="border border-base-300 rounded-lg p-3 space-y-1">
              <p className="text-xs font-medium mb-2">服务商配置</p>
              {(["text", "image", "video"] as const).map((m) => (
                <p key={m} className="text-xs text-muted-foreground">
                  <span className="capitalize">{m}</span>: {getProviderLabel((form[`${m}_provider_override` as keyof FormData] as string | null) || "inherit-default")}
                </p>
              ))}
            </div>

            {createMutation.isError && (
              <div className="alert alert-error">
                创建失败: {(createMutation.error as Error)?.message || "请重试"}
              </div>
            )}

            <div className="flex gap-2">
              <button onClick={() => setStep(2)} className="btn btn-ghost flex-1">
                ← 返回
              </button>
              <button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="btn btn-primary flex-1"
              >
                {createMutation.isPending ? "创建中..." : "创建项目"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
