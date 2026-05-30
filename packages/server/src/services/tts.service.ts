import { Injectable } from "@nestjs/common";
import { EdgeTTS, Communicate } from "edge-tts-universal";

@Injectable()
export class TtsService {
  /**
   * Synthesize speech and return MP3 audio buffer.
   * Uses Microsoft Edge's free TTS service.
   */
  async synthesizeSpeech(
    text: string,
    voice = "zh-CN-XiaoxiaoNeural",
    options?: { rate?: string; volume?: string },
  ): Promise<Buffer> {
    const tts = new EdgeTTS(text, voice, {
      rate: options?.rate || "+0%",
      volume: options?.volume || "+0%",
    });

    const result = await tts.synthesize();
    return Buffer.from(await result.audio.arrayBuffer());
  }

  /**
   * Stream speech synthesis for real-time audio.
   * Returns an async iterable of audio chunks.
   */
  async *streamSpeech(
    text: string,
    voice = "zh-CN-XiaoxiaoNeural",
    options?: { rate?: string },
  ): AsyncGenerator<Buffer> {
    const communicate = new Communicate(text, {
      voice,
      rate: options?.rate || "+0%",
    });

    for await (const chunk of communicate.stream()) {
      if (chunk.type === "audio" && chunk.data) {
        yield chunk.data;
      }
    }
  }

  /**
   * Get list of available Chinese voices.
   */
  static CHINESE_VOICES = [
    { name: "zh-CN-XiaoxiaoNeural", label: "晓晓 (女声 — 温暖)", gender: "Female" },
    { name: "zh-CN-YunxiNeural", label: "云希 (男声 — 新闻)", gender: "Male" },
    { name: "zh-CN-YunjianNeural", label: "云健 (男声 — 运动)", gender: "Male" },
    { name: "zh-CN-XiaoyiNeural", label: "晓伊 (女声 — 活泼)", gender: "Female" },
    { name: "zh-CN-YunyangNeural", label: "云扬 (男声 — 专业)", gender: "Male" },
    { name: "zh-CN-XiaochenNeural", label: "晓辰 (女声 — 自然)", gender: "Female" },
    { name: "zh-CN-XiaohanNeural", label: "晓涵 (女声 — 温柔)", gender: "Female" },
    { name: "zh-CN-XiaomengNeural", label: "晓梦 (女声 — 可爱)", gender: "Female" },
    { name: "zh-CN-XiaomoNeural", label: "晓墨 (女声 — 知性)", gender: "Female" },
    { name: "zh-CN-XiaoqiuNeural", label: "晓秋 (女声 — 成熟)", gender: "Female" },
    { name: "zh-CN-XiaoruiNeural", label: "晓睿 (女声 — 大气)", gender: "Female" },
    { name: "zh-CN-XiaoshuangNeural", label: "晓双 (女声 — 童声)", gender: "Female" },
    { name: "zh-CN-XiaoxuanNeural", label: "晓萱 (女声 — 温柔)", gender: "Female" },
    { name: "zh-CN-XiaoyanNeural", label: "晓颜 (女声 — 甜美)", gender: "Female" },
    { name: "zh-CN-XiaozhenNeural", label: "晓臻 (女声 — 稳重)", gender: "Female" },
  ];
}
