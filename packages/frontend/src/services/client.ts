/**
 * Core API client - fetchApi, static URL resolution, and API object re-exports.
 */
import { ApiError } from "./errors";

// ---------------------------------------------------------------------------
// Backend base URL resolution (mirrors old project's runtimeBase pattern)
// ---------------------------------------------------------------------------
const DEV_BACKEND_PORT = "3000";

function getApiBase(): string {
  // 1. Explicit env var takes priority
  try {
    if (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_URL) {
      return (import.meta as any).env.VITE_API_URL as string;
    }
  } catch { /* SSR / non-Vite */ }

  // 2. Dev mode - use page origin, replacing port with backend port
  if (typeof window !== "undefined") {
    try {
      if ((import.meta as any)?.env?.DEV ?? false) {
        const url = new URL(window.location.href);
        return `${url.protocol}//${url.hostname}:${DEV_BACKEND_PORT}`;
      }
    } catch { /* ignore */ }
    // 3. Production / fallback - same origin
    return window.location.origin;
  }

  // 4. SSR / no window - localhost fallback
  return `http://localhost:${DEV_BACKEND_PORT}`;
}

// Resolve once at module load
const API_BASE = getApiBase();

// ---------------------------------------------------------------------------
// getStaticUrl - safely convert relative /static/... paths to full URLs
// ---------------------------------------------------------------------------
export function getStaticUrl(path: string | null | undefined): string | null {
  if (!path) return null;

  const trimmedPath = path.trim();

  // Already a full HTTP(S) URL - validate protocol
  if (trimmedPath.startsWith("http://") || trimmedPath.startsWith("https://")) {
    try {
      const url = new URL(trimmedPath);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        console.warn(`[Security] Invalid protocol in URL: ${url.protocol}`);
        return null;
      }
      return trimmedPath;
    } catch {
      console.warn(`[Security] Invalid URL format: ${trimmedPath}`);
      return null;
    }
  }

  // Block dangerous protocols
  const dangerousProtocols = [
    "javascript:",
    "data:",
    "vbscript:",
    "file:",
    "about:",
  ];
  if (
    dangerousProtocols.some((proto) =>
      trimmedPath.toLowerCase().startsWith(proto),
    )
  ) {
    console.warn(`[Security] Dangerous protocol detected: ${trimmedPath}`);
    return null;
  }

  // Relative path - prefix with API_BASE
  return `${API_BASE}${trimmedPath}`;
}

// ---------------------------------------------------------------------------
// fetchApi - typed fetch wrapper with structured error handling
// ---------------------------------------------------------------------------
export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  try {
    // Read admin token from localStorage (non-critical - wrap in try/catch)
    let adminToken: string | null = null;
    try {
      adminToken = localStorage.getItem("openoii_admin_token");
    } catch { /* localStorage unavailable (SSR / worker env) */ }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(adminToken ? { "X-Admin-Token": adminToken } : {}),
        ...options?.headers,
      },
    });

    // Handle 204 No Content / empty body
    if (res.status === 204 || res.headers.get("content-length") === "0") {
      return undefined as T;
    }

    // Attempt JSON parse
    let data: T;
    try {
      data = (await res.json()) as T;
    } catch {
      if (!res.ok) {
        throw new ApiError(
          "INVALID_RESPONSE",
          "服务器返回了无效的响应格式",
          res.status,
          undefined,
          { method: options?.method || "GET", url: endpoint },
        );
      }
      // OK response with unparseable body - treat as void
      return undefined as T;
    }

    if (!res.ok) {
      // Extract structured error envelope: { error: { code, message, details } }
      const errorObj = data as unknown as {
        error?: { code?: string; message?: string; details?: unknown };
      };
      const errorData = errorObj.error || {};
      throw new ApiError(
        errorData.code || "API_ERROR",
        errorData.message || res.statusText || "请求失败",
        res.status,
        errorData.details,
        { method: options?.method || "GET", url: endpoint },
        typeof data === "string" ? data : JSON.stringify(data),
      );
    }

    return data;
  } catch (error) {
    // Do NOT double-wrap already-thrown ApiError instances
    if (error instanceof ApiError) {
      throw error;
    }

    // Network error or other unexpected failure
    throw new ApiError(
      "NETWORK_ERROR",
      "网络连接失败，请检查您的网络设置",
      undefined,
      { originalError: String(error) },
      { method: options?.method || "GET", url: endpoint },
    );
  }
}

// ---------------------------------------------------------------------------
// Re-export all API object groups
// ---------------------------------------------------------------------------
export { projectsApi } from "./projectsApi";
export { shotsApi } from "./shotsApi";
export { charactersApi } from "./charactersApi";
export { assetsApi } from "./assetsApi";
export { versionsApi } from "./versionsApi";
export { configApi } from "./configApi";
export { styleTemplatesApi } from "./styleTemplatesApi";
export { exportApi } from "./exportApi";
export { consistencyApi } from "./consistencyApi";
export { universesApi } from "./universesApi";
