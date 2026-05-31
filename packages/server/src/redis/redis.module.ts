import { Module, Global } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";

export const REDIS_CLIENT = "REDIS_CLIENT";
export const REDIS_SUBSCRIBER = "REDIS_SUBSCRIBER";

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>("app.redisUrl") || config.get<string>("REDIS_URL") || "redis://localhost:6379/0";
        return new Redis(url, { maxRetriesPerRequest: null });
      },
    },
    {
      provide: REDIS_SUBSCRIBER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>("app.redisUrl") || config.get<string>("REDIS_URL") || "redis://localhost:6379/0";
        return new Redis(url, { maxRetriesPerRequest: null });
      },
    },
  ],
  exports: [REDIS_CLIENT, REDIS_SUBSCRIBER],
})
export class RedisModule {}
