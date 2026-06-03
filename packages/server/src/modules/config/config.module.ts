import { Module } from "@nestjs/common";
import { RuntimeConfigController } from "./config.controller";
import { RuntimeConfigService } from "./config.service";

@Module({
  controllers: [RuntimeConfigController],
  providers: [RuntimeConfigService],
})
export class RuntimeConfigModule {}
