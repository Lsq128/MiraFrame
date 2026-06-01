import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const port = config.get<number>("app.port") || 3000;
  app.enableCors();
  await app.listen(port);
  console.log(`Server running on http://localhost:${port}`);
}

bootstrap();
