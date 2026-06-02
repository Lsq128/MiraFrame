import { registerAs } from "@nestjs/config";

/**
 * 应用配置 — 对标老项目 backend/app/config.py Settings
 *
 * 环境变量命名遵循老项目约定（UPPER_SNAKE_CASE），
 * 在 NestJS 中通过 this.config.get('app.xxx') 访问。
 */

export const appConfig = registerAs("app", () => ({
  // ── 基础 ──
  appName: process.env.APP_NAME || "openOii-backend",
  environment: process.env.NODE_ENV || "dev",
  logLevel: process.env.LOG_LEVEL || "info",
  port: parseInt(process.env.PORT || "3000", 10),
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
  adminToken: process.env.ADMIN_TOKEN || null,
  publicBaseUrl: process.env.PUBLIC_BASE_URL || null,
  requestTimeoutS: parseFloat(process.env.REQUEST_TIMEOUT_S || "120"),

  // ── 数据库 ──
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:5432/openoii",

  // ── Redis ──
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379/0",
  redisHost: process.env.REDIS_HOST || "localhost",
  redisPort: parseInt(process.env.REDIS_PORT || "6379", 10),

  // ── Anthropic / LLM ──
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || null,
  anthropicAuthToken: process.env.ANTHROPIC_AUTH_TOKEN || null,
  anthropicBaseUrl: process.env.ANTHROPIC_BASE_URL || null,
  anthropicModel: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929",

  // ── 文本生成 ──
  textProvider: process.env.TEXT_PROVIDER || "fake",
  textBaseUrl:
    process.env.TEXT_BASE_URL ||
    "https://dashscope.aliyuncs.com/compatible-mode/v1",
  textApiKey: process.env.TEXT_API_KEY || null,
  textModel: process.env.TEXT_MODEL || "deepseek-v4-flash",
  textEndpoint: process.env.TEXT_ENDPOINT || "/chat/completions",
  textEnableThinking: process.env.TEXT_ENABLE_THINKING === "true",
  fakeTextResponse: process.env.FAKE_TEXT_RESPONSE || null,

  // ── 图像生成 ──
  imageProvider: process.env.IMAGE_PROVIDER || "fake",
  imageBaseUrl: process.env.IMAGE_BASE_URL || "https://api.openai.com/v1",
  imageApiKey: process.env.IMAGE_API_KEY || null,
  imageModel: process.env.IMAGE_MODEL || "dall-e-3",
  imageEndpoint: process.env.IMAGE_ENDPOINT || "/images/generations",
  enableImageToImage: process.env.ENABLE_IMAGE_TO_IMAGE === "true",
  fakeImageFixtureUrl: process.env.FAKE_IMAGE_FIXTURE_URL || null,

  // ── 视频生成 ──
  videoProvider: process.env.VIDEO_PROVIDER || "fake",
  videoBaseUrl: process.env.VIDEO_BASE_URL || "https://api.example.com/v1",
  videoApiKey: process.env.VIDEO_API_KEY || null,
  videoModel: process.env.VIDEO_MODEL || "video-gen-1",
  videoEndpoint: process.env.VIDEO_ENDPOINT || "/videos/generations",
  videoMode: process.env.VIDEO_MODE || "text",
  enableImageToVideo: process.env.ENABLE_IMAGE_TO_VIDEO === "true",
  videoImageMode: process.env.VIDEO_IMAGE_MODE || "first_frame",
  videoInlineLocalImages: process.env.VIDEO_INLINE_LOCAL_IMAGES !== "false",
  ffmpegPath: process.env.FFMPEG_PATH || "ffmpeg",
  // 豆包
  doubaoApiKey: process.env.DOUBAO_API_KEY || null,
  doubaoVideoModel:
    process.env.DOUBAO_VIDEO_MODEL || "doubao-seedance-1-5-pro-251215",
  doubaoVideoDuration: parseInt(process.env.DOUBAO_VIDEO_DURATION || "5", 10),
  doubaoVideoRatio: process.env.DOUBAO_VIDEO_RATIO || "adaptive",
  doubaoGenerateAudio: process.env.DOUBAO_GENERATE_AUDIO !== "false",
  // Fake
  fakeVideoFixtureUrl: process.env.FAKE_VIDEO_FIXTURE_URL || null,
  fakeVideoFixturePath: process.env.FAKE_VIDEO_FIXTURE_PATH || null,

  // ── TTS / BGM ──
  ttsEnabled: process.env.TTS_ENABLED !== "false",
  ttsDefaultVoice:
    process.env.TTS_DEFAULT_VOICE || "zh-CN-XiaoxiaoNeural",
  ttsVolume: parseFloat(process.env.TTS_VOLUME || "1.0"),
  bgmEnabled: process.env.BGM_ENABLED !== "false",
  bgmVolume: parseFloat(process.env.BGM_VOLUME || "0.3"),
  bgmDirectory: process.env.BGM_DIRECTORY || "static/bgm",

  // ── 工作流 ──
  thinkingChainEnabled: process.env.THINKING_CHAIN_ENABLED !== "false",
  thinkingChainDetailLevel:
    process.env.THINKING_CHAIN_DETAIL_LEVEL || "normal",
  critiqueEnabled: process.env.CRITIQUE_ENABLED !== "false",
  critiqueScoreThreshold: parseFloat(
    process.env.CRITIQUE_SCORE_THRESHOLD || "6.0",
  ),
  critiqueMaxRounds: parseInt(process.env.CRITIQUE_MAX_ROUNDS || "2", 10),
  outlineEnabled: process.env.OUTLINE_ENABLED !== "false",
}));

export type AppConfig = ReturnType<typeof appConfig>;

function parseCorsOrigins(raw?: string): string[] {
  if (!raw) return ["*"];
  try {
    // 支持 JSON 数组格式: ["http://a","http://b"] 或逗号分隔
    if (raw.startsWith("[")) {
      return JSON.parse(raw) as string[];
    }
    return raw.split(",").map((s) => s.trim());
  } catch {
    return raw.split(",").map((s) => s.trim());
  }
}
