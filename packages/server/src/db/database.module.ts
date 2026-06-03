import { Module, Global, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export const DRIZZLE = "DRIZZLE";

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const connectionString =
          config.get<string>("app.databaseUrl") ||
          config.get<string>("DATABASE_URL") ||
          "postgres://postgres:postgres@localhost:5432/miraframe";
        const client = postgres(connectionString, { max: 10 });
        return drizzle(client, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule implements OnModuleInit {
  async onModuleInit() {
    console.log("DatabaseModule initialized");
  }
}

export type Db = PostgresJsDatabase<typeof schema>;
