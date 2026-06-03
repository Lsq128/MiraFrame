import { Body, Controller, Get, HttpCode, HttpStatus, Inject, Post, Put } from "@nestjs/common";
import { RuntimeConfigService, type ConfigValue } from "./config.service";

@Controller("api/v1/config")
export class RuntimeConfigController {
  constructor(@Inject(RuntimeConfigService) private readonly runtimeConfig: RuntimeConfigService) {}

  @Get()
  async list() {
    return this.runtimeConfig.list();
  }

  @Put()
  async update(@Body() body: { configs?: Record<string, ConfigValue> }) {
    const configs = Object.fromEntries(
      Object.entries(body.configs || {}).map(([key, value]) => [
        key,
        value === null ? null : String(value),
      ]),
    );
    return this.runtimeConfig.update(configs);
  }

  @Post("test-connection")
  @HttpCode(HttpStatus.OK)
  async testConnection(@Body() body: { service?: "llm" | "image" | "video"; config_overrides?: Record<string, string | null> }) {
    const service = body.service === "image" || body.service === "video" ? body.service : "llm";
    return this.runtimeConfig.testConnection(service, body.config_overrides);
  }

  @Post("reveal")
  @HttpCode(HttpStatus.OK)
  reveal(@Body() body: { key?: string }) {
    return this.runtimeConfig.reveal(String(body.key || ""));
  }
}
