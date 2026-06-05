import { Body, Controller, Get, HttpCode, Put } from "@nestjs/common";
import { z } from "zod";
import { SystemConfigService } from "./system-config.service";

const aiConfigSchema = z.object({
  textModel: z.record(z.unknown()).default({}),
  imageModel: z.record(z.unknown()).default({}),
  visionModel: z.record(z.unknown()).default({}),
  documentParser: z.record(z.unknown()).default({}),
  storage: z.record(z.unknown()).default({})
});

@Controller("system-config")
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get()
  getConfig() {
    return this.systemConfigService.getAppConfig();
  }

  @Put()
  @HttpCode(200)
  saveConfig(@Body() body: unknown) {
    return this.systemConfigService.saveAppConfig(aiConfigSchema.parse(body));
  }
}
