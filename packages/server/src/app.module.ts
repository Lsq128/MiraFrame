import { Module } from "@nestjs/common";
import { CoreModule } from "./core";
import { DatabaseModule } from "./db";
import { RedisModule } from "./redis";
import { ServicesModule } from "./services";
import { WsModule } from "./ws";
import { AgentModule } from "./agent";
import { GenerationModule } from "./modules/generation";
import { BullModule } from "@nestjs/bullmq";

@Module({
  imports: [
    CoreModule,
    DatabaseModule,
    RedisModule,
    ServicesModule,
    WsModule,
    // BullMQ for background jobs
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || "localhost",
        port: parseInt(process.env.REDIS_PORT || "6379"),
      },
    }),
    AgentModule,
    GenerationModule,
  ],
})
export class AppModule {}
