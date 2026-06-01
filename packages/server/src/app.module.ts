import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CoreModule } from "./core";
import { DatabaseModule } from "./db";
import { RedisModule } from "./redis";
import { ServicesModule } from "./services";
import { WsModule } from "./ws";
import { AgentModule } from "./agent";
import { GenerationModule } from "./modules/generation";
import { ProjectsModule } from "./modules/projects/projects.module";
import { BullModule } from "@nestjs/bullmq";

@Module({
  imports: [
    CoreModule,
    DatabaseModule,
    RedisModule,
    ServicesModule,
    WsModule,
    // BullMQ for background jobs
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>("app.redisHost") || "localhost",
          port: config.get<number>("app.redisPort") || 6379,
        },
      }),
    }),
    AgentModule,
    GenerationModule,
    ProjectsModule,
  ],
})
export class AppModule {}
