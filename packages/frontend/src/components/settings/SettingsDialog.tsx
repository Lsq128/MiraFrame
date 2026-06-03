"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Eye, EyeOff, FlaskConical, Image, KeyRound, Save, Settings, Type, Video, XCircle } from "lucide-react";
import { configApi } from "@/services/configApi";
import { useSettingsStore } from "@/stores/settingsStore";
import { cn } from "@/lib/utils";
import type { ConfigItem, ConfigValue } from "@/types";

type ServiceKey = "text" | "image" | "video";

const SERVICE_CONFIG = {
  text: {
    title: "文本生成",
    description: "用于故事大纲、角色设定、分镜脚本和提示词生成。",
    icon: Type,
    testService: "llm" as const,
    keys: ["TEXT_PROVIDER", "TEXT_BASE_URL", "TEXT_API_KEY", "TEXT_MODEL", "TEXT_ENDPOINT", "TEXT_ENABLE_THINKING", "FAKE_TEXT_RESPONSE"],
  },
  image: {
    title: "图像生成",
    description: "用于角色图和分镜首帧生成。",
    icon: Image,
    testService: "image" as const,
    keys: ["IMAGE_PROVIDER", "IMAGE_BASE_URL", "IMAGE_API_KEY", "IMAGE_MODEL", "IMAGE_ENDPOINT", "ENABLE_IMAGE_TO_IMAGE", "FAKE_IMAGE_FIXTURE_URL"],
  },
  video: {
    title: "视频生成",
    description: "用于镜头视频片段和最终合成前的素材生成。",
    icon: Video,
    testService: "video" as const,
    keys: ["VIDEO_PROVIDER", "VIDEO_BASE_URL", "VIDEO_API_KEY", "VIDEO_MODEL", "VIDEO_ENDPOINT", "ENABLE_IMAGE_TO_VIDEO", "VIDEO_IMAGE_MODE", "VIDEO_INLINE_LOCAL_IMAGES", "FAKE_VIDEO_FIXTURE_URL"],
  },
};

const LABELS: Record<string, string> = {
  TEXT_PROVIDER: "服务商",
  TEXT_BASE_URL: "Base URL",
  TEXT_API_KEY: "API Key",
  TEXT_MODEL: "模型",
  TEXT_ENDPOINT: "Endpoint",
  TEXT_ENABLE_THINKING: "Thinking",
  FAKE_TEXT_RESPONSE: "Fake 响应",
  IMAGE_PROVIDER: "服务商",
  IMAGE_BASE_URL: "Base URL",
  IMAGE_API_KEY: "API Key",
  IMAGE_MODEL: "模型",
  IMAGE_ENDPOINT: "Endpoint",
  ENABLE_IMAGE_TO_IMAGE: "图生图",
  FAKE_IMAGE_FIXTURE_URL: "Fake 图片 URL",
  VIDEO_PROVIDER: "服务商",
  VIDEO_BASE_URL: "Base URL",
  VIDEO_API_KEY: "API Key",
  VIDEO_MODEL: "模型",
  VIDEO_ENDPOINT: "Endpoint",
  ENABLE_IMAGE_TO_VIDEO: "图生视频",
  VIDEO_IMAGE_MODE: "参考图模式",
  VIDEO_INLINE_LOCAL_IMAGES: "内联本地图片",
  FAKE_VIDEO_FIXTURE_URL: "Fake 视频 URL",
};

const PROVIDER_KEYS = new Set(["TEXT_PROVIDER", "IMAGE_PROVIDER", "VIDEO_PROVIDER"]);
const BOOLEAN_KEYS = new Set(["TEXT_ENABLE_THINKING", "ENABLE_IMAGE_TO_IMAGE", "ENABLE_IMAGE_TO_VIDEO", "VIDEO_INLINE_LOCAL_IMAGES"]);
const SECRET_KEYS = new Set(["TEXT_API_KEY", "IMAGE_API_KEY", "VIDEO_API_KEY"]);

export function SettingsDialog() {
  const isOpen = useSettingsStore((s) => s.isModalOpen);
  const closeModal = useSettingsStore((s) => s.closeModal);
  const queryClient = useQueryClient();
  const [active, setActive] = useState<ServiceKey>("text");
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});
  const [testResult, setTestResult] = useState<Record<ServiceKey, { success: boolean; message: string; details?: string | null } | null>>({
    text: null,
    image: null,
    video: null,
  });

  const configQuery = useQuery({
    queryKey: ["config"],
    queryFn: configApi.get,
    enabled: isOpen,
  });

  const configItems = configQuery.data || [];
  const itemByKey = useMemo(() => new Map(configItems.map((item) => [item.key, item])), [configItems]);

  useEffect(() => {
    if (!configItems.length) return;
    setDraft(Object.fromEntries(configItems.map((item) => [item.key, item.value === null ? "" : String(item.value)])));
  }, [configItems]);

  const updateMutation = useMutation({
    mutationFn: (payload: Record<string, ConfigValue>) => configApi.update(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
    },
  });

  const testMutation = useMutation({
    mutationFn: (service: ServiceKey) => configApi.testConnection(SERVICE_CONFIG[service].testService, buildOverrides(service, draft, itemByKey)),
    onSuccess: (result, service) => {
      setTestResult((prev) => ({ ...prev, [service]: result }));
    },
  });

  if (!isOpen) return null;

  const activeConfig = SERVICE_CONFIG[active];
  const ActiveIcon = activeConfig.icon;
  const savePayload = buildSavePayload(draft, itemByKey);

  return (
    <div className="fixed inset-0 z-50 bg-black/45 p-4 flex items-center justify-center">
      <div className="w-full max-w-5xl max-h-[88vh] rounded-lg border border-base-300 bg-base-100 shadow-2xl overflow-hidden flex flex-col">
        <header className="h-14 shrink-0 border-b border-base-300 px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Settings className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold">生成服务设置</p>
              <p className="text-xs text-muted-foreground">配置 MiraFrame 的文本、图像和视频生成能力</p>
            </div>
          </div>
          <button type="button" className="btn btn-ghost btn-circle" onClick={closeModal} aria-label="关闭设置">
            <XCircle className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 grid grid-cols-[220px_1fr]">
          <aside className="border-r border-base-300 bg-base-200/60 p-3">
            {(Object.keys(SERVICE_CONFIG) as ServiceKey[]).map((key) => {
              const config = SERVICE_CONFIG[key];
              const Icon = config.icon;
              const result = testResult[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActive(key)}
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left flex items-start gap-2 transition-colors",
                    active === key ? "bg-base-100 text-base-content shadow-sm" : "hover:bg-base-100/70 text-muted-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{config.title}</span>
                    <span className="block text-[11px] mt-0.5">{result ? result.message : config.description}</span>
                  </span>
                  {result && (
                    <span className={cn("mt-0.5 h-2 w-2 rounded-full", result.success ? "bg-success" : "bg-error")} />
                  )}
                </button>
              );
            })}
          </aside>

          <main className="min-h-0 overflow-y-auto p-5">
            {configQuery.isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <span className="loading loading-spinner loading-lg" />
              </div>
            ) : configQuery.isError ? (
              <div className="alert alert-error">设置加载失败，请确认后端 `/api/v1/config` 已启动。</div>
            ) : (
              <div className="space-y-5">
                <section className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <ActiveIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <h2 className="text-lg font-semibold">{activeConfig.title}</h2>
                      <p className="text-sm text-muted-foreground mt-1">{activeConfig.description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline btn-sm gap-1"
                    disabled={testMutation.isPending}
                    onClick={() => testMutation.mutate(active)}
                  >
                    {testMutation.isPending ? <span className="loading loading-spinner loading-xs" /> : <FlaskConical className="h-4 w-4" />}
                    测试连接
                  </button>
                </section>

                {testResult[active] && (
                  <div className={cn("rounded-lg border p-3 text-sm flex items-start gap-2", testResult[active]?.success ? "border-success/30 bg-success/10" : "border-error/30 bg-error/10")}>
                    {testResult[active]?.success ? <CheckCircle2 className="h-4 w-4 text-success mt-0.5" /> : <XCircle className="h-4 w-4 text-error mt-0.5" />}
                    <div>
                      <p className="font-medium">{testResult[active]?.message}</p>
                      {testResult[active]?.details && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{testResult[active]?.details}</p>}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {activeConfig.keys.map((key) => (
                    <ConfigField
                      key={key}
                      item={itemByKey.get(key)}
                      value={draft[key] || ""}
                      visible={!!visibleSecrets[key]}
                      onChange={(value) => setDraft((prev) => ({ ...prev, [key]: value }))}
                      onToggleVisible={() => setVisibleSecrets((prev) => ({ ...prev, [key]: !prev[key] }))}
                    />
                  ))}
                </div>

                <div className="rounded-lg border border-base-300 bg-base-200/50 p-3 text-xs text-muted-foreground">
                  API Key 留空会清除当前配置；脱敏值未修改时不会覆盖原始密钥。图像和视频测试为配置完整性检查，不会实际消耗生成额度。
                </div>
              </div>
            )}
          </main>
        </div>

        <footer className="shrink-0 border-t border-base-300 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {updateMutation.data?.message || "设置会保存到本地 .env，并在当前服务进程中立即更新。"}
          </p>
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-ghost btn-sm" onClick={closeModal}>关闭</button>
            <button
              type="button"
              className="btn btn-primary btn-sm gap-1"
              disabled={updateMutation.isPending || Object.keys(savePayload).length === 0}
              onClick={() => updateMutation.mutate(savePayload)}
            >
              {updateMutation.isPending ? <span className="loading loading-spinner loading-xs" /> : <Save className="h-4 w-4" />}
              保存设置
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function ConfigField({
  item,
  value,
  visible,
  onChange,
  onToggleVisible,
}: {
  item?: ConfigItem;
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggleVisible: () => void;
}) {
  const key = item?.key || "";
  const isSecret = SECRET_KEYS.has(key);
  const isBoolean = BOOLEAN_KEYS.has(key);
  const isProvider = PROVIDER_KEYS.has(key);

  return (
    <label className="rounded-lg border border-base-300 bg-base-100 p-3">
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium">{LABELS[key] || key}</span>
        <span className="text-[10px] text-muted-foreground">{item?.source || "default"}</span>
      </span>
      {isProvider ? (
        <select className="select mt-2" value={value || "fake"} onChange={(event) => onChange(event.target.value)}>
          <option value="openai">OpenAI compatible</option>
          <option value="fake">Fake</option>
        </select>
      ) : isBoolean ? (
        <select className="select mt-2" value={value || "false"} onChange={(event) => onChange(event.target.value)}>
          <option value="true">开启</option>
          <option value="false">关闭</option>
        </select>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <input
            className="input"
            type={isSecret && !visible ? "password" : "text"}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={isSecret ? "留空清除，输入新值覆盖" : undefined}
          />
          {isSecret && (
            <button type="button" className="btn btn-outline btn-circle shrink-0" onClick={onToggleVisible} aria-label={visible ? "隐藏密钥" : "显示密钥"}>
              {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
      )}
      {isSecret && (
        <span className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <KeyRound className="h-3 w-3" />
          密钥会脱敏展示
        </span>
      )}
    </label>
  );
}

function buildOverrides(service: ServiceKey, draft: Record<string, string>, itemByKey: Map<string, ConfigItem>): Record<string, string | null> {
  return Object.fromEntries(
    SERVICE_CONFIG[service].keys
      .map((key) => [key, normalizeConfigValue(key, draft[key] || "", itemByKey.get(key))] as const)
      .filter(([, value]) => value !== undefined),
  ) as Record<string, string | null>;
}

function buildSavePayload(draft: Record<string, string>, itemByKey: Map<string, ConfigItem>): Record<string, ConfigValue> {
  return Object.fromEntries(
    Object.entries(draft)
      .map(([key, value]) => [key, normalizeConfigValue(key, value, itemByKey.get(key))])
      .filter(([, value]) => value !== undefined),
  ) as Record<string, ConfigValue>;
}

function normalizeConfigValue(key: string, value: string, item?: ConfigItem): string | null | undefined {
  if (item?.is_sensitive && item.is_masked && value === String(item.value || "")) return undefined;
  if (value.trim() === "") return null;
  return value;
}
