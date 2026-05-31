import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { appConfig } from "../config/app.config";

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ["../../.env", "../../.env.local", ".env.local", ".env"],
      load: [appConfig],
    }),
  ],
})
export class CoreModule {}
