import { Body, Controller, Get, HttpCode, Post } from "@nestjs/common";
import { z } from "zod";
import { AiService } from "./ai.service";

const chatMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1)
});

const chatRequestSchema = z.object({
  messages: z.array(chatMessageSchema).min(1),
  temperature: z.number().min(0).max(2).optional(),
  responseFormat: z.enum(["text", "json"]).optional()
});

const providerConnectionSchema = z.object({
  providerId: z.string(),
  baseUrl: z.string().optional(),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  capability: z.enum(["text", "vision", "image"]).default("text"),
  extraHeaders: z.record(z.string()).optional()
});

@Controller("ai")
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get("providers")
  listProviders() {
    return this.aiService.listProviders();
  }

  @Post("chat")
  @HttpCode(200)
  chat(@Body() body: unknown) {
    return this.aiService.chat(chatRequestSchema.parse(body));
  }

  @Post("models")
  @HttpCode(200)
  listModels(@Body() body: unknown) {
    return this.aiService.listModels(providerConnectionSchema.parse(body));
  }

  @Post("test")
  @HttpCode(200)
  testConnection(@Body() body: unknown) {
    return this.aiService.testConnection(providerConnectionSchema.parse(body));
  }
}
