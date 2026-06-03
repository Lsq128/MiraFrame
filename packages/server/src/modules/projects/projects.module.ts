import { Module } from "@nestjs/common";
import { ProjectsController } from "./projects.controller";
import { CharactersController } from "./characters.controller";
import { ShotsController } from "./shots.controller";
import { WsModule } from "../../ws";
import { AgentModule } from "../../agent";

@Module({
  imports: [WsModule, AgentModule],
  controllers: [ProjectsController, CharactersController, ShotsController],
})
export class ProjectsModule {}
