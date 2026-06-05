import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { aiProviderCatalog, storageProviderCatalog } from "@yudu-bidkit/shared";
import { PrismaService } from "../prisma/prisma.service";

const appConfigKey = "app-config";

export interface AppConfig {
  textModel: Record<string, unknown>;
  imageModel: Record<string, unknown>;
  visionModel: Record<string, unknown>;
  documentParser: Record<string, unknown>;
  storage: Record<string, unknown>;
}

const defaultAppConfig: AppConfig = {
  textModel: {
    providerId: "deepseek",
    providerName: "DeepSeek",
    baseUrl: aiProviderCatalog.find((provider) => provider.id === "deepseek")?.defaultBaseUrl,
    model: "deepseek-chat",
    temperature: 0.4,
    maxTokens: 8192,
    status: "untested"
  },
  imageModel: {
    providerId: "volcengine",
    providerName: "火山方舟",
    baseUrl: aiProviderCatalog.find((provider) => provider.id === "volcengine")?.defaultBaseUrl,
    model: "doubao-seedream-3-0-t2i",
    size: "1024x1024",
    status: "untested"
  },
  visionModel: {
    providerId: "dashscope",
    providerName: "阿里云百炼 / 通义千问",
    baseUrl: aiProviderCatalog.find((provider) => provider.id === "dashscope")?.defaultBaseUrl,
    model: "qwen-vl-plus",
    status: "untested"
  },
  documentParser: {
    provider: "local-worker",
    endpoint: "http://localhost:8100",
    status: "available"
  },
  storage: {
    providerId: "minio",
    providerName: storageProviderCatalog.find((provider) => provider.id === "minio")?.name,
    endpoint: storageProviderCatalog.find((provider) => provider.id === "minio")?.defaultEndpoint,
    bucket: storageProviderCatalog.find((provider) => provider.id === "minio")?.bucketHint,
    region: storageProviderCatalog.find((provider) => provider.id === "minio")?.defaultRegion,
    accessKeyId: "yudu",
    secretAccessKey: "yudu-bidkit",
    forcePathStyle: true,
    useSSL: false,
    prefix: "uploads/",
    status: "untested"
  }
};

function mergeConfig(value?: unknown): AppConfig {
  const source = value && typeof value === "object" ? (value as Partial<AppConfig>) : {};
  return {
    textModel: { ...defaultAppConfig.textModel, ...source.textModel },
    imageModel: { ...defaultAppConfig.imageModel, ...source.imageModel },
    visionModel: { ...defaultAppConfig.visionModel, ...source.visionModel },
    documentParser: { ...defaultAppConfig.documentParser, ...source.documentParser },
    storage: { ...defaultAppConfig.storage, ...source.storage }
  };
}

@Injectable()
export class SystemConfigService {
  constructor(private readonly prisma: PrismaService) {}

  async getAppConfig() {
    const row = await this.prisma.systemConfig.findUnique({
      where: { key: appConfigKey }
    });
    return mergeConfig(row?.value);
  }

  async saveAppConfig(input: AppConfig) {
    const value = mergeConfig(input) as unknown as Prisma.InputJsonObject;
    const row = await this.prisma.systemConfig.upsert({
      where: { key: appConfigKey },
      create: {
        key: appConfigKey,
        value
      },
      update: {
        value
      }
    });
    return mergeConfig(row.value);
  }
}
