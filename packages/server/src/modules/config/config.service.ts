import { Injectable } from "@nestjs/common";
import { access, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { join, resolve } from "node:path";

export type ConfigValue = string | number | boolean | null;

export interface ConfigItem {
  key: string;
  value: ConfigValue;
  is_sensitive: boolean;
  is_masked: boolean;
  source: "env" | "default";
}

const CONFIG_DEFINITIONS: Array<{
  key: string;
  defaultValue: string | null;
  sensitive?: boolean;
  restartRequired?: boolean;
}> = [
  { key: "TEXT_PROVIDER", defaultValue: "fake" },
  { key: "TEXT_BASE_URL", defaultValue: "https://dashscope.aliyuncs.com/compatible-mode/v1" },
  { key: "TEXT_API_KEY", defaultValue: null, sensitive: true },
  { key: "TEXT_MODEL", defaultValue: "deepseek-v4-flash" },
  { key: "TEXT_ENDPOINT", defaultValue: "/chat/completions" },
  { key: "TEXT_ENABLE_THINKING", defaultValue: "false" },
  { key: "FAKE_TEXT_RESPONSE", defaultValue: null },
  { key: "IMAGE_PROVIDER", defaultValue: "fake" },
  { key: "IMAGE_BASE_URL", defaultValue: "https://api.openai.com/v1" },
  { key: "IMAGE_API_KEY", defaultValue: null, sensitive: true },
  { key: "IMAGE_MODEL", defaultValue: "dall-e-3" },
  { key: "IMAGE_ENDPOINT", defaultValue: "/images/generations" },
  { key: "ENABLE_IMAGE_TO_IMAGE", defaultValue: "false" },
  { key: "FAKE_IMAGE_FIXTURE_URL", defaultValue: null },
  { key: "VIDEO_PROVIDER", defaultValue: "fake" },
  { key: "VIDEO_BASE_URL", defaultValue: "https://api.example.com/v1" },
  { key: "VIDEO_API_KEY", defaultValue: null, sensitive: true },
  { key: "VIDEO_MODEL", defaultValue: "video-gen-1" },
  { key: "VIDEO_ENDPOINT", defaultValue: "/videos/generations" },
  { key: "ENABLE_IMAGE_TO_VIDEO", defaultValue: "true" },
  { key: "VIDEO_IMAGE_MODE", defaultValue: "first_frame" },
  { key: "VIDEO_INLINE_LOCAL_IMAGES", defaultValue: "true" },
  { key: "FAKE_VIDEO_FIXTURE_URL", defaultValue: null },
  { key: "FAKE_VIDEO_FIXTURE_PATH", defaultValue: null, sensitive: true },
  { key: "PUBLIC_BASE_URL", defaultValue: null },
  { key: "REQUEST_TIMEOUT_S", defaultValue: "120.0" },
  { key: "ADMIN_TOKEN", defaultValue: null, sensitive: true },
];

const CONFIG_BY_KEY = new Map(CONFIG_DEFINITIONS.map((definition) => [definition.key, definition]));

@Injectable()
export class RuntimeConfigService {
  async list(): Promise<ConfigItem[]> {
    return CONFIG_DEFINITIONS.map((definition) => this.toConfigItem(definition.key));
  }

  async update(configs: Record<string, string | null>): Promise<{
    updated: number;
    skipped: number;
    restart_required: boolean;
    restart_keys: string[];
    message: string;
  }> {
    const nextValues: Record<string, string | null> = {};
    let skipped = 0;

    for (const [key, value] of Object.entries(configs)) {
      if (!CONFIG_BY_KEY.has(key)) {
        skipped++;
        continue;
      }
      const normalized = value === null || value === "" ? null : String(value);
      nextValues[key] = normalized;
      if (normalized === null) delete process.env[key];
      else process.env[key] = normalized;
    }

    if (Object.keys(nextValues).length > 0) {
      await this.writeEnvValues(nextValues);
    }

    const restartKeys = Object.keys(nextValues).filter((key) => CONFIG_BY_KEY.get(key)?.restartRequired);
    return {
      updated: Object.keys(nextValues).length,
      skipped,
      restart_required: restartKeys.length > 0,
      restart_keys: restartKeys,
      message: restartKeys.length > 0 ? "配置已保存，部分配置需重启后完全生效。" : "配置已保存。",
    };
  }

  reveal(key: string): { key: string; value: string | null } {
    if (!CONFIG_BY_KEY.has(key)) return { key, value: null };
    return { key, value: process.env[key] || null };
  }

  async testConnection(service: "llm" | "image" | "video", overrides?: Record<string, string | null>) {
    const config = {
      ...Object.fromEntries(CONFIG_DEFINITIONS.map(({ key }) => [key, process.env[key] || null])),
      ...(overrides || {}),
    };

    if (service === "llm") return this.testText(config);
    if (service === "image") return this.testMediaConfig("image", config);
    return this.testMediaConfig("video", config);
  }

  private toConfigItem(key: string): ConfigItem {
    const definition = CONFIG_BY_KEY.get(key);
    const rawValue = process.env[key] ?? definition?.defaultValue ?? null;
    const isSensitive = !!definition?.sensitive;
    return {
      key,
      value: isSensitive && rawValue ? maskSecret(rawValue) : rawValue,
      is_sensitive: isSensitive,
      is_masked: isSensitive && !!rawValue,
      source: process.env[key] !== undefined ? "env" : "default",
    };
  }

  private async testText(config: Record<string, string | null>) {
    if (config.TEXT_PROVIDER === "fake") {
      return { success: true, message: "Fake 文本服务可用。", details: null, status: "valid" };
    }

    const baseUrl = config.TEXT_BASE_URL;
    const endpoint = config.TEXT_ENDPOINT || "/chat/completions";
    const apiKey = config.TEXT_API_KEY;
    const model = config.TEXT_MODEL;
    if (!baseUrl || !apiKey || !model) {
      return { success: false, message: "文本服务配置不完整。", details: "需要 TEXT_BASE_URL、TEXT_API_KEY、TEXT_MODEL。", status: "invalid" };
    }

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "请只回复 ok" }],
          max_tokens: 8,
          temperature: 0,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        return { success: false, message: `文本服务连接失败：HTTP ${response.status}`, details: text.substring(0, 300), status: "invalid" };
      }
      return { success: true, message: "文本服务连接正常。", details: null, status: "valid", capabilities: { generate: true, stream: false } };
    } catch (error) {
      return { success: false, message: "文本服务连接失败。", details: String(error), status: "invalid" };
    }
  }

  private testMediaConfig(service: "image" | "video", config: Record<string, string | null>) {
    const upper = service === "image" ? "IMAGE" : "VIDEO";
    if (config[`${upper}_PROVIDER`] === "fake") {
      return { success: true, message: `${service === "image" ? "图像" : "视频"} Fake 服务可用。`, details: null, status: "valid" };
    }
    const missing = [`${upper}_BASE_URL`, `${upper}_API_KEY`, `${upper}_MODEL`].filter((key) => !config[key]);
    if (missing.length > 0) {
      return {
        success: false,
        message: `${service === "image" ? "图像" : "视频"}服务配置不完整。`,
        details: `缺少：${missing.join(", ")}`,
        status: "invalid",
      };
    }
    return {
      success: true,
      message: `${service === "image" ? "图像" : "视频"}服务配置完整。`,
      details: "为避免产生生成成本，此处只校验配置完整性，不实际调用生成接口。",
      status: "valid",
      capabilities: { generate: true, stream: false },
    };
  }

  private async writeEnvValues(values: Record<string, string | null>): Promise<void> {
    const envPath = await findEnvPath();
    const current = await readFile(envPath, "utf-8").catch(() => "");
    const lines = current.split(/\r?\n/);
    const seen = new Set<string>();
    const nextLines = lines.map((line) => {
      const match = /^([A-Z0-9_]+)=/.exec(line);
      if (!match || !(match[1] in values)) return line;
      const key = match[1];
      seen.add(key);
      const value = values[key];
      return value === null ? `${key}=` : `${key}=${value}`;
    });

    for (const [key, value] of Object.entries(values)) {
      if (!seen.has(key)) nextLines.push(value === null ? `${key}=` : `${key}=${value}`);
    }

    await writeFile(envPath, nextLines.join("\n"), "utf-8");
  }
}

async function findEnvPath(): Promise<string> {
  const candidates = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "../../.env"),
    join(resolve(process.cwd()), "..", "..", ".env"),
  ];
  for (const candidate of candidates) {
    try {
      await access(candidate, constants.F_OK | constants.W_OK);
      return candidate;
    } catch {
      // keep looking
    }
  }
  return candidates[0];
}

function maskSecret(value: string): string {
  if (value.length <= 8) return "••••";
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}
