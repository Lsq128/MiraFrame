import { Module, Global } from "@nestjs/common";
import { TextService } from "./text.service";
import { ImageService } from "./image.service";
import { VideoService } from "./video.service";
import { FaceService } from "./face.service";
import { TtsService } from "./tts.service";
import { SidecarService } from "./sidecar.service";

@Global()
@Module({
  providers: [TextService, ImageService, VideoService, FaceService, TtsService, SidecarService],
  exports: [TextService, ImageService, VideoService, FaceService, TtsService, SidecarService],
})
export class ServicesModule {}
