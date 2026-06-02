import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { NestExpressApplication } from "@nestjs/platform-express";
import { join } from "node:path";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);
  const port = config.get<number>("app.port") || 3000;
  app.useStaticAssets(join(process.cwd(), "static"), { prefix: "/static/" });
  app.enableCors();
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
}

bootstrap();
