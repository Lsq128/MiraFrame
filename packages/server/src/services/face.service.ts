import { Injectable, OnModuleInit } from "@nestjs/common";
import * as faceapi from "@vladmandic/face-api";
import * as canvas from "canvas";
import * as path from "path";

// Monkey-patch canvas for Node.js environment
(globalThis as Record<string, unknown>).HTMLCanvasElement = canvas.Canvas;
(globalThis as Record<string, unknown>).CanvasRenderingContext2D = canvas.CanvasRenderingContext2D;
(globalThis as Record<string, unknown>).Image = canvas.Image;
(globalThis as Record<string, unknown>).ImageData = canvas.ImageData;
// createImageBitmap is not available in Node.js canvas — stub it for face-api compatibility
(globalThis as Record<string, unknown>).createImageBitmap = undefined;

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
export class FaceService implements OnModuleInit {
  private ready = false;
  private loadError: string | null = null;

  async onModuleInit() {
    try {
      // Load face-api models (SSD MobileNet + Face Landmark + Face Recognition)
      const modelPath = path.join(process.cwd(), "node_modules/@vladmandic/face-api/model");
      await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
      await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
      await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
      this.ready = true;
      console.log("FaceService: models loaded successfully");
    } catch (error) {
      this.loadError = error instanceof Error ? error.message : String(error);
      console.warn("FaceService: failed to load models:", this.loadError);
    }
  }

  async detectFaces(imageBase64: string, minDetScore = 0.5): Promise<FaceDetectResult> {
    if (!this.ready) {
      return { faces: [], count: 0, error: this.loadError || "Face model not loaded" };
    }

    try {
      // Decode base64 to image
      const img = await canvas.loadImage(Buffer.from(imageBase64, "base64"));

      // Detect faces with landmarks and descriptors
      const detections = await faceapi
        .detectAllFaces(img as unknown as canvas.Image)
        .withFaceLandmarks()
        .withFaceDescriptors();

      const faces = detections
        .filter((d) => d.detection.score >= minDetScore)
        .map((d) => ({
          bbox: [
            d.detection.box.x,
            d.detection.box.y,
            d.detection.box.width,
            d.detection.box.height,
          ],
          det_score: d.detection.score,
          embedding: Array.from(d.descriptor) as number[],
        }));

      return { faces, count: faces.length, error: null };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("FaceService: detectFaces error:", message);
      return { faces: [], count: 0, error: message };
    }
  }

  isReady(): boolean {
    return this.ready;
  }
}
