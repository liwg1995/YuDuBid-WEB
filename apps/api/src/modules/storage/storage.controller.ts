import { Body, Controller, Get, HttpCode, Post, Put } from "@nestjs/common";
import { z } from "zod";
import { StorageService } from "./storage.service";

const storageConfigSchema = z.object({
  providerId: z.string().default("minio"),
  providerName: z.string().optional(),
  endpoint: z.string().optional(),
  region: z.string().optional(),
  bucket: z.string().optional(),
  accessKeyId: z.string().optional(),
  secretAccessKey: z.string().optional(),
  forcePathStyle: z.boolean().optional(),
  useSSL: z.boolean().optional(),
  prefix: z.string().optional(),
  status: z.string().optional()
});

@Controller("storage")
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get("providers")
  listProviders() {
    return this.storageService.listProviders();
  }

  @Get("config")
  getConfig() {
    return this.storageService.getConfig();
  }

  @Put("config")
  @HttpCode(200)
  saveConfig(@Body() body: unknown) {
    return this.storageService.saveConfig(storageConfigSchema.parse(body));
  }

  @Post("test")
  @HttpCode(200)
  testConnection(@Body() body: unknown) {
    return this.storageService.testConnection(storageConfigSchema.parse(body));
  }
}
