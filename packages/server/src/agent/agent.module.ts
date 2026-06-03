import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { AgentService } from "./agent.service";
import { AgentProcessor } from "./agent.processor";
import { RevisionService } from "./revision.service";
import { WsModule } from "../ws";

@Module({
  imports: [
    BullModule.registerQueue({
      name: "generation",
    }),
    WsModule,
  ],
  providers: [AgentService, AgentProcessor, RevisionService],
  exports: [AgentService],
})
export class AgentModule {}
