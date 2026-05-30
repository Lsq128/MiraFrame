import { Module } from "@nestjs/common";
import { CoreModule } from "./core";
import { DatabaseModule } from "./db";
import { ServicesModule } from "./services";
import { WsModule } from "./ws";

@Module({
  imports: [CoreModule, DatabaseModule, ServicesModule, WsModule],
})
export class AppModule {}
