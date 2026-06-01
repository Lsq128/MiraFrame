import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { extractMediaUrl, extractTaskId, extractTaskStatus } from "./image.service";

@Injectable()
export class VideoService {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  async generateVideo(
    prompt: string,
    options?: { imageUrl?: string | null; duration?: number | null; ratio?: string | null },
  ): Promise<string> {
    const provider = this.config.get<string>("app.videoProvider") || "fake";
    const fixtureUrl = this.config.get<string>("app.fakeVideoFixtureUrl");
    if (provider === "fake") return fixtureUrl || "about:blank#video-fixture";

    const baseUrl = this.config.get<string>("app.videoBaseUrl") || "https://api.example.com/v1";
    const configuredEndpoint = this.config.get<string>("app.videoEndpoint") || "";
    const isDashScope = baseUrl.includes("dashscope");
    const endpoint =
      isDashScope && (!configuredEndpoint || configuredEndpoint === "/videos/generations")
        ? "/services/aigc/video-generation/video-synthesis"
        : configuredEndpoint || "/videos/generations";
    const apiKey =
      this.config.get<string>("app.videoApiKey") ||
      this.config.get<string>("app.doubaoApiKey") ||
      "";
    const model =
      this.config.get<string>("app.videoModel") ||
      this.config.get<string>("app.doubaoVideoModel") ||
      "video-gen-1";

    if (!apiKey) return "about:blank#video-api-key-missing";

    const response = await fetch(`${baseUrl}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        ...(isDashScope ? { "X-DashScope-Async": "enable" } : {}),
      },
      body: JSON.stringify(
        isDashScope
          ? {
              model,
              input: {
                prompt,
                ...(options?.imageUrl
                  ? {
                      media: [
                        {
                          type: "first_frame",
                          url: options.imageUrl,
                        },
                      ],
                    }
                  : {}),
              },
              parameters: {
                duration: options?.duration || this.config.get<number>("app.doubaoVideoDuration") || 5,
                resolution: "720P",
                prompt_extend: true,
                watermark: false,
              },
            }
          : {
              model,
              prompt,
              image_url: options?.imageUrl || undefined,
              duration: options?.duration || this.config.get<number>("app.doubaoVideoDuration") || 5,
              ratio: options?.ratio || this.config.get<string>("app.doubaoVideoRatio") || "adaptive",
            },
      ),
      signal: AbortSignal.timeout(300_000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Video API error ${response.status}: ${errorText.substring(0, 200)}`);
    }

    const json = (await response.json()) as Record<string, unknown>;
    const url = extractMediaUrl(json);
    if (url) return url;

    const taskId = extractTaskId(json) || stringValue(json.id) || stringValue(json.task_id) || stringValue(json.taskId);
    if (taskId && isDashScope) {
      const taskUrl = await this.pollDashScopeTask(baseUrl, apiKey, taskId, 300_000);
      if (taskUrl) return taskUrl;
      return `${baseUrl}/tasks/${taskId}`;
    }
    if (taskId) return `${baseUrl}${endpoint}/${taskId}`;

    throw new Error(`Video API returned no URL: ${JSON.stringify(json).substring(0, 300)}`);
  }

  composeVideo(clipUrls: string[]): string {
    return `openoii:composition:${encodeURIComponent(JSON.stringify(clipUrls))}`;
  }

  private async pollDashScopeTask(baseUrl: string, apiKey: string, taskId: string, timeoutMs: number): Promise<string | null> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      await sleep(10_000);
      const response = await fetch(`${baseUrl}/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) continue;
      const json = (await response.json()) as Record<string, unknown>;
      const status = extractTaskStatus(json);
      if (status === "FAILED" || status === "CANCELED" || status === "UNKNOWN") {
        throw new Error(`Video task ${taskId} failed: ${JSON.stringify(json).substring(0, 300)}`);
      }
      const url = extractMediaUrl(json);
      if (status === "SUCCEEDED" && url) return url;
    }
    return null;
  }
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
