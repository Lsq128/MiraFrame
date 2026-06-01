/**
 * Config API — system configuration, connection testing, sensitive value reveal.
 */
import { fetchApi } from "./client";
import type { ConfigItem, ConfigValue } from "@/types";

export const configApi = {
  get: () => fetchApi<ConfigItem[]>("/api/v1/config"),

  update: (config: Record<string, ConfigValue>) => {
    const normalizedConfig = Object.fromEntries(
      Object.entries(config).map(([key, value]) => [
        key,
        value === null ? null : String(value),
      ]),
    ) as Record<string, string | null>;

    return fetchApi<{
      updated: number;
      skipped: number;
      restart_required: boolean;
      restart_keys: string[];
      message: string;
    }>("/api/v1/config", {
      method: "PUT",
      body: JSON.stringify({ configs: normalizedConfig }),
    }).then((res) => {
      if ("ADMIN_TOKEN" in config) {
        const token = config.ADMIN_TOKEN;
        if (typeof token === "string" && token.length > 0) {
          localStorage.setItem("openoii_admin_token", token);
        } else {
          localStorage.removeItem("openoii_admin_token");
        }
      }
      return res;
    });
  },

  testConnection: (
    service: "llm" | "image" | "video",
    configOverrides?: Record<string, string | null>,
  ) =>
    fetchApi<{
      success: boolean;
      message: string;
      details: string | null;
      status?: "valid" | "degraded" | "invalid" | null;
      capabilities?: {
        generate?: boolean | null;
        stream?: boolean | null;
      } | null;
    }>("/api/v1/config/test-connection", {
      method: "POST",
      body: JSON.stringify({ service, config_overrides: configOverrides }),
    }),

  revealValue: (key: string) =>
    fetchApi<{ key: string; value: string | null }>("/api/v1/config/reveal", {
      method: "POST",
      body: JSON.stringify({ key }),
    }),
};
