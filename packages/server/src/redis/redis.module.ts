import { Module, Global } from "@nestjs/common";
import Redis from "ioredis";

export const REDIS_CLIENT = "REDIS_CLIENT";
export const REDIS_SUBSCRIBER = "REDIS_SUBSCRIBER";

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => {
        const url = process.env.REDIS_URL || "redis://localhost:6379/0";
        return new Redis(url, { maxRetriesPerRequest: null });
      },
    },
    {
      provide: REDIS_SUBSCRIBER,
      useFactory: () => {
        const url = process.env.REDIS_URL || "redis://localhost:6379/0";
        return new Redis(url, { maxRetriesPerRequest: null });
      },
    },
  ],
  exports: [REDIS_CLIENT, REDIS_SUBSCRIBER],
})
export class RedisModule {}
