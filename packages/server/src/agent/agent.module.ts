import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { AgentService } from "./agent.service";
import { AgentProcessor } from "./agent.processor";
import { WsModule } from "../ws";

@Module({
  imports: [
    BullModule.registerQueue({
      name: "generation",
    }),
    WsModule,
  ],
  providers: [AgentService, AgentProcessor],
  exports: [AgentService],
})
export class AgentModule {}
