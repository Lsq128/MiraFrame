import { Injectable } from "@nestjs/common";

@Injectable()
export class TextService {
  async generate(
    prompt: string,
    options?: { maxTokens?: number; temperature?: number },
  ): Promise<string> {
    // Placeholder - will be implemented with Anthropic SDK
    console.log("TextService.generate called", {
      prompt: prompt.substring(0, 100),
      options,
    });
    return "placeholder response";
  }
}
