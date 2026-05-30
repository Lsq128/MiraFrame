import { Module, Global, OnModuleInit } from "@nestjs/common";
import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export const DRIZZLE = "DRIZZLE";

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE,
      useFactory: () => {
        const connectionString =
          process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/openoii";
        const client = postgres(connectionString, { max: 10 });
        return drizzle(client, { schema });
      },
    },
  ],
  exports: [DRIZZLE],
})
export class DatabaseModule implements OnModuleInit {
  async onModuleInit() {
    // Migration will be handled by drizzle-kit CLI
    console.log("DatabaseModule initialized");
  }
}

export type Db = PostgresJsDatabase<typeof schema>;
