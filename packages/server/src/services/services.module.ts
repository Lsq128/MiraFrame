import { Module, Global } from "@nestjs/common";
import { TextService } from "./text.service";

@Global()
@Module({
  providers: [TextService],
  exports: [TextService],
})
export class ServicesModule {}
