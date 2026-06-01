import { Injectable, Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class TextService {
  constructor(@Inject(ConfigService) private readonly config: ConfigService) {}

  async generate(
    prompt: string,
    options?: { maxTokens?: number; temperature?: number; systemPrompt?: string },
  ): Promise<string> {
    const provider = this.config.get<string>("app.textProvider") || "anthropic";
    const baseUrl =
      this.config.get<string>("app.textBaseUrl") ||
      this.config.get<string>("ANTHROPIC_BASE_URL") ||
      "https://dashscope.aliyuncs.com/compatible-mode/v1";
    const apiKey =
      this.config.get<string>("app.textApiKey") ||
      this.config.get<string>("ANTHROPIC_AUTH_TOKEN") ||
      "";
    const model =
      this.config.get<string>("app.textModel") ||
      this.config.get<string>("ANTHROPIC_MODEL") ||
      "qwen3.6-plus";
    const endpoint =
      this.config.get<string>("app.textEndpoint") ||
      this.config.get<string>("TEXT_ENDPOINT") ||
      "/chat/completions";

    console.log(`[TextService] provider=${provider} model=${model}`);
    console.log(`[TextService] url=${baseUrl}${endpoint}`);

    if (provider === "fake") {
      return this.generateFakeResponse(prompt);
    }

    if (!apiKey) {
      console.warn("[TextService] No API key configured — returning placeholder");
      return `[LLM not configured] API key not set. Prompt was: ${prompt.substring(0, 100)}...`;
    }

    const body = {
      model,
      messages: [
        {
          role: "system",
          content:
            options?.systemPrompt ||
            "You are a creative AI assistant specialized in story creation, character design, and storyboarding for animated comics.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: options?.maxTokens || 4096,
      temperature: options?.temperature ?? 0.7,
    };

    console.log(`[TextService] → POST ${baseUrl}${endpoint}`);

    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120_000),
      });

      console.log(`[TextService] ← HTTP ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.error(`[TextService] LLM API error ${response.status}: ${errorText}`);
        throw new Error(`LLM API error ${response.status}: ${errorText.substring(0, 200)}`);
      }

      const json = (await response.json()) as Record<string, unknown>;
      console.log(`[TextService] Response structure:`, Object.keys(json));

      // OpenAI-compatible: choices[0].message.content
      const choices = json.choices as Array<{ message?: { content?: string } }> | undefined;
      if (choices?.[0]?.message?.content) {
        const content = choices[0].message.content;
        console.log(`[TextService] Content length=${content.length}`);
        return content;
      }

      // Anthropic-compatible: content[0].text
      const contentArr = json.content as Array<{ text?: string }> | undefined;
      if (contentArr?.[0]?.text) {
        console.log(`[TextService] Content length=${contentArr[0].text.length}`);
        return contentArr[0].text;
      }

      console.warn(`[TextService] Unexpected response format:`, JSON.stringify(json).substring(0, 300));
      return JSON.stringify(json);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("LLM API error")) {
        throw error;
      }
      console.error(`[TextService] Network/fetch error:`, error);
      throw new Error(`LLM call failed: ${String(error)}`);
    }
  }

  private generateFakeResponse(prompt: string): string {
    const normalized = prompt.toLowerCase();

    if (normalized.includes("shot")) {
      return JSON.stringify({
        shots: [
          {
            order: 1,
            description: "雨夜街角，少女撑伞停在熄灭的路灯下，城市霓虹被雨水拉成长线。",
            camera: "Wide shot",
            scene: "雨夜街道",
            action: "少女抬头看见一盏微弱发光的灯笼。",
            dialogue: "这里以前，好像很亮。",
          },
          {
            order: 2,
            description: "AI 灯笼从旧灯杆旁亮起，用温柔光点组成一段遗失的童年画面。",
            camera: "Medium shot",
            scene: "旧灯杆旁",
            action: "星灯绕着少女旋转，投射光影故事。",
            dialogue: "我负责记得，你负责再次看见。",
          },
          {
            order: 3,
            description: "少女跟随光点奔跑，沿途一盏盏路灯被点亮，行人的表情逐渐柔和。",
            camera: "Tracking shot",
            scene: "城市长街",
            action: "城市记忆被连续点亮。",
            dialogue: "",
          },
          {
            order: 4,
            description: "天色放晴，少女把速写本摊开，星灯停在肩旁，整座城市映出暖色光晕。",
            camera: "Close-up",
            scene: "清晨天台",
            action: "少女画下新的故事开头。",
            dialogue: "这一次，我也想把光留下。",
          },
        ],
      });
    }

    if (normalized.includes("character")) {
      return JSON.stringify({
        characters: [
          {
            name: "林小雨",
            description: "敏感但勇敢的少女，习惯把情绪藏在速写本里，在故事中逐步学会主动表达。",
          },
          {
            name: "星灯",
            description: "会讲故事的 AI 灯笼，外形温暖灵动，能用光影唤醒城市中被遗忘的记忆。",
          },
        ],
      });
    }

    return JSON.stringify({
      title: "雨夜星灯",
      logline: "一个孤独少女遇见会讲故事的 AI 灯笼，在雨夜城市中找回被遗忘的温暖记忆。",
      acts: [
        "少女在雨夜迷路，发现一盏会说话的灯笼。",
        "灯笼带她看见城市遗失的回忆，两人一起点亮街区。",
        "少女学会记录和分享自己的故事，城市重新拥有光。",
      ],
      visual_bible: "治愈系二次元漫剧，雨夜霓虹、暖金光点、柔和镜头运动，情绪从冷蓝过渡到晨曦金。",
    });
  }
}
