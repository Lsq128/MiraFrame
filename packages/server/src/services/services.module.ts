import { Module, Global } from "@nestjs/common";
import { TextService } from "./text.service";
import { FaceService } from "./face.service";
import { TtsService } from "./tts.service";
import { SidecarService } from "./sidecar.service";

@Global()
@Module({
  providers: [TextService, FaceService, TtsService, SidecarService],
  exports: [TextService, FaceService, TtsService, SidecarService],
})
export class ServicesModule {}
