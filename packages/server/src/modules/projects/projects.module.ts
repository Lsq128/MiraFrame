import { Module } from "@nestjs/common";
import { ProjectsController } from "./projects.controller";
import { CharactersController } from "./characters.controller";
import { ShotsController } from "./shots.controller";

@Module({
  controllers: [ProjectsController, CharactersController, ShotsController],
})
export class ProjectsModule {}
