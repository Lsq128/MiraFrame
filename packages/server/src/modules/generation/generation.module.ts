import { Module } from "@nestjs/common";
import { GenerationController } from "./generation.controller";
import { AgentModule } from "../../agent/agent.module";

@Module({
  imports: [AgentModule],
  controllers: [GenerationController],
})
export class GenerationModule {}
