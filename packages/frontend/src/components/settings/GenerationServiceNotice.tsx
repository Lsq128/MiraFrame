"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Settings } from "lucide-react";
import { configApi } from "@/services/configApi";
import { useSettingsStore } from "@/stores/settingsStore";
import type { ConfigItem } from "@/types";

const SERVICE_REQUIREMENTS = [
  { label: "文本", provider: "TEXT_PROVIDER", required: ["TEXT_BASE_URL", "TEXT_API_KEY", "TEXT_MODEL"] },
  { label: "图像", provider: "IMAGE_PROVIDER", required: ["IMAGE_BASE_URL", "IMAGE_API_KEY", "IMAGE_MODEL"] },
  { label: "视频", provider: "VIDEO_PROVIDER", required: ["VIDEO_BASE_URL", "VIDEO_API_KEY", "VIDEO_MODEL"] },
];

export function GenerationServiceNotice() {
  const openSettings = useSettingsStore((state) => state.openModal);
  const { data, isError, isLoading } = useQuery({
    queryKey: ["config"],
    queryFn: configApi.get,
  });

  const status = useMemo(() => getGenerationServiceStatus(data || []), [data]);

  if (isLoading) return null;
  if (!isError && status.ready) return null;

  return (
    <div className="mb-5 rounded-lg border border-warning/35 bg-warning/10 px-4 py-3 text-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <div>
            <p className="font-medium">生成服务还没有完全配置</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isError
                ? "暂时无法读取生成服务设置，真实生成前建议先检查配置。"
                : formatStatusMessage(status.fakeServices, status.incompleteServices)}
            </p>
          </div>
        </div>
        <button type="button" className="btn btn-outline btn-xs shrink-0 gap-1" onClick={openSettings}>
          <Settings className="h-3.5 w-3.5" />
          去设置
        </button>
      </div>
    </div>
  );
}

function formatStatusMessage(fakeServices: string[], incompleteServices: string[]) {
  const messages: string[] = [];
  if (fakeServices.length > 0) messages.push(`${fakeServices.join("、")}服务仍在使用 Fake`);
  if (incompleteServices.length > 0) messages.push(`${incompleteServices.join("、")}服务配置不完整`);
  return `${messages.join("，")}。`;
}

function getGenerationServiceStatus(configItems: ConfigItem[]) {
  const itemByKey = new Map(configItems.map((item) => [item.key, item]));
  const fakeServices: string[] = [];
  const incompleteServices: string[] = [];

  for (const service of SERVICE_REQUIREMENTS) {
    const provider = String(itemByKey.get(service.provider)?.value || "fake");
    if (provider === "fake") {
      fakeServices.push(service.label);
      continue;
    }
    const hasMissingConfig = service.required.some((key) => {
      const item = itemByKey.get(key);
      if (!item) return true;
      if (item.is_sensitive && item.is_masked) return false;
      return item.value === null || String(item.value).trim() === "";
    });
    if (hasMissingConfig) incompleteServices.push(service.label);
  }

  return {
    ready: fakeServices.length === 0 && incompleteServices.length === 0,
    fakeServices,
    incompleteServices,
  };
}
