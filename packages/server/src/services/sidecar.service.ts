import { Injectable } from "@nestjs/common";
import { FaceService, FaceDetectResult } from "./face.service";
import { TtsService } from "./tts.service";

@Injectable()
export class SidecarService {
  constructor(
    private readonly faceService: FaceService,
    private readonly ttsService: TtsService,
  ) {}

  async detectFaces(imageBase64: string): Promise<FaceDetectResult> {
    return this.faceService.detectFaces(imageBase64);
  }

  async synthesizeSpeech(text: string, voice?: string): Promise<Buffer> {
    return this.ttsService.synthesizeSpeech(text, voice);
  }

  async healthCheck(): Promise<{ status: string; face_model_available: boolean }> {
    return {
      status: "ok",
      face_model_available: this.faceService.isReady(),
    };
  }
}
