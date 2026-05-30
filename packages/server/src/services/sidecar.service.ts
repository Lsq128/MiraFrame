import { Injectable } from "@nestjs/common";

const SIDECAR_URL = process.env.SIDECAR_URL || "http://localhost:8001";

export interface FaceDetectResult {
  faces: Array<{
    bbox: number[];
    det_score: number;
    embedding: number[] | null;
  }>;
  count: number;
  error: string | null;
}

@Injectable()
export class SidecarService {
  async detectFaces(imageBase64: string): Promise<FaceDetectResult> {
    const response = await fetch(`${SIDECAR_URL}/detect-faces`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_base64: imageBase64 }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Face detection failed: ${text}`);
    }
    return response.json();
  }

  async synthesizeSpeech(text: string, voice?: string): Promise<Buffer> {
    const response = await fetch(`${SIDECAR_URL}/synthesize-speech`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voice: voice || "zh-CN-XiaoxiaoNeural" }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`TTS failed: ${text}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  async healthCheck(): Promise<{ status: string; face_model_available: boolean }> {
    const response = await fetch(`${SIDECAR_URL}/health`);
    return response.json();
  }
}
