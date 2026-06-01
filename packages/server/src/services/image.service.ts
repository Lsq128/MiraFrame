import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class ImageService {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  async generateImage(prompt: string, options?: { size?: string }): Promise<string> {
    const provider = this.config.get<string>("app.imageProvider") || "fake";
    const fixtureUrl = this.config.get<string>("app.fakeImageFixtureUrl");
    if (provider === "fake") return fixtureUrl || placeholderDataUrl("Image fixture");

    const baseUrl = this.config.get<string>("app.imageBaseUrl") || "https://api.openai.com/v1";
    const endpoint = this.config.get<string>("app.imageEndpoint") || "/images/generations";
    const apiKey = this.config.get<string>("app.imageApiKey") || "";
    const model = this.config.get<string>("app.imageModel") || "dall-e-3";
    const isDashScope = baseUrl.includes("dashscope") || endpoint.includes("multimodal-generation");

    if (!apiKey) return placeholderDataUrl("Image API key missing");

    const requestBody = JSON.stringify(
      isDashScope
        ? {
            model,
            input: {
              messages: [
                {
                  role: "user",
                  content: [{ text: prompt }],
                },
              ],
            },
            parameters: {
              prompt_extend: true,
              watermark: false,
              size: normalizeDashScopeSize(options?.size || "1024x1024"),
            },
          }
        : {
            model,
            prompt,
            n: 1,
            size: options?.size || "1024x1024",
          },
    );

    const response = await postWithRateLimitRetry(`${baseUrl}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: requestBody,
      timeoutMs: 180_000,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Image API error ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const json = (await response.json()) as Record<string, unknown>;
    let url = extractMediaUrl(json);
    if (!url) {
      const taskId = extractTaskId(json);
      if (taskId) url = await this.pollDashScopeTask(baseUrl, apiKey, taskId, 180_000);
    }
    if (!url) throw new Error(`Image API returned no URL: ${JSON.stringify(json).substring(0, 300)}`);
    return url;
  }

  private async pollDashScopeTask(baseUrl: string, apiKey: string, taskId: string, timeoutMs: number): Promise<string | null> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await sleep(5_000);
      const response = await fetch(`${baseUrl}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) continue;
      const json = (await response.json()) as Record<string, unknown>;
      const status = extractTaskStatus(json);
      if (status === "FAILED" || status === "CANCELED" || status === "UNKNOWN") {
        throw new Error(`Image task ${taskId} failed: ${JSON.stringify(json).substring(0, 300)}`);
      }
      const url = extractMediaUrl(json);
      if (status === "SUCCEEDED" && url) return url;
    }
    return null;
  }
}

export function extractMediaUrl(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of ["url", "image", "img_url", "image_url", "video_url", "output_url"]) {
    if (typeof record[key] === "string" && record[key]) return record[key];
  }

  const b64 = record.b64_json;
  if (typeof b64 === "string" && b64) return `data:image/png;base64,${b64}`;

  for (const key of ["data", "output", "result", "results", "choices", "message", "content"]) {
    const nested = record[key];
    if (Array.isArray(nested)) {
      for (const item of nested) {
        const url = extractMediaUrl(item);
        if (url) return url;
      }
    } else {
      const url = extractMediaUrl(nested);
      if (url) return url;
    }
  }

  return null;
}

export function extractTaskId(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of ["task_id", "taskId", "id"]) {
    if (typeof record[key] === "string" && record[key]) return record[key];
  }
  for (const key of ["output", "data", "result"]) {
    const nested = extractTaskId(record[key]);
    if (nested) return nested;
  }
  return null;
}

export function extractTaskStatus(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.task_status === "string") return record.task_status;
  if (typeof record.status === "string") return record.status;
  for (const key of ["output", "data", "result"]) {
    const nested = extractTaskStatus(record[key]);
    if (nested) return nested;
  }
  return null;
}

function normalizeDashScopeSize(size: string): string {
  return size.replace("x", "*");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postWithRateLimitRetry(
  url: string,
  options: { headers: Record<string, string>; body: string; timeoutMs: number },
): Promise<Response> {
  let lastResponse: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: options.headers,
      body: options.body,
      signal: AbortSignal.timeout(options.timeoutMs),
    });
    if (response.status !== 429) return response;
    lastResponse = response;
    await response.text().catch(() => "");
    await sleep((attempt + 1) * 20_000);
  }
  return lastResponse as Response;
}

function placeholderDataUrl(label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="100%" height="100%" fill="#f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="44" fill="#6b7280">${label}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
