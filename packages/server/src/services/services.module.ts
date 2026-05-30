import { Module, Global } from "@nestjs/common";
import { TextService } from "./text.service";
import { SidecarService } from "./sidecar.service";

@Global()
@Module({
  providers: [TextService, SidecarService],
  exports: [TextService, SidecarService],
})
export class ServicesModule {}
