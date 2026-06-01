import { Module } from "@nestjs/common";
import { GenerationController } from "./generation.controller";
import { AgentModule } from "../../agent/agent.module";
import { WsModule } from "../../ws";

@Module({
  imports: [AgentModule, WsModule],
  controllers: [GenerationController],
})
export class GenerationModule {}
