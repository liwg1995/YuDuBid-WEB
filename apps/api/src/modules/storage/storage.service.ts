import { Injectable } from "@nestjs/common";
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { storageProviderCatalog } from "@yudu-bidkit/shared";
import { SystemConfigService } from "../system-config/system-config.service";

interface StorageConfigInput {
  providerId?: string;
  providerName?: string;
  endpoint?: string;
  region?: string;
  bucket?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  forcePathStyle?: boolean;
  useSSL?: boolean;
  prefix?: string;
  status?: string;
}

interface UploadObjectInput {
  buffer: Buffer;
  fileName: string;
  contentType?: string;
  prefix?: string;
}

function providerById(providerId: string) {
  return storageProviderCatalog.find((provider) => provider.id === providerId);
}

function normalizeEndpoint(endpoint?: string, useSSL = true) {
  const value = String(endpoint || "").trim().replace(/\/+$/, "");
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${useSSL ? "https" : "http"}://${value}`;
}

function normalizedPrefix(value?: string) {
  const prefix = String(value || "").trim().replace(/^\/+/, "");
  if (!prefix) return "";
  return prefix.endsWith("/") ? prefix : `${prefix}/`;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error);
}

function safeFileName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

@Injectable()
export class StorageService {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  listProviders() {
    return storageProviderCatalog;
  }

  async getConfig() {
    const config = await this.systemConfigService.getAppConfig();
    return config.storage;
  }

  async saveConfig(input: StorageConfigInput) {
    const current = await this.systemConfigService.getAppConfig();
    const providerId = input.providerId || "minio";
    const provider = providerById(providerId);
    const storage = {
      ...current.storage,
      ...input,
      providerId,
      providerName: input.providerName || provider?.name || providerId,
      endpoint: input.endpoint || provider?.defaultEndpoint || "",
      region: input.region || provider?.defaultRegion || "auto"
    };
    const saved = await this.systemConfigService.saveAppConfig({
      ...current,
      storage
    });
    return saved.storage;
  }

  async testConnection(input: StorageConfigInput) {
    const providerId = input.providerId || "minio";
    const provider = providerById(providerId);
    const useSSL = input.useSSL ?? provider?.useSSL ?? true;
    const endpoint = normalizeEndpoint(input.endpoint || provider?.defaultEndpoint, useSSL);
    const region = input.region || provider?.defaultRegion || "auto";
    const bucket = String(input.bucket || provider?.bucketHint || "").trim();
    const accessKeyId = String(input.accessKeyId || "").trim();
    const secretAccessKey = String(input.secretAccessKey || "").trim();

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      return {
        providerId,
        status: "unavailable",
        message: "请填写 Endpoint、Bucket、Access Key 和 Secret Key 后再测试。"
      };
    }

    const client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      },
      forcePathStyle: input.forcePathStyle ?? provider?.forcePathStyle ?? true
    });

    const key = `${normalizedPrefix(input.prefix)}bidkit-healthcheck/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.txt`;

    try {
      await this.ensureBucket(client, bucket, providerId);
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: Buffer.from("YuDu_Bidkit storage healthcheck", "utf8"),
          ContentType: "text/plain; charset=utf-8"
        })
      );
      await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));

      return {
        providerId,
        providerName: provider?.name || input.providerName || providerId,
        endpoint,
        bucket,
        region,
        status: "available",
        key,
        checkedAt: new Date().toISOString(),
        message: "对象存储连接测试成功。"
      };
    } catch (error) {
      return {
        providerId,
        providerName: provider?.name || input.providerName || providerId,
        endpoint,
        bucket,
        region,
        status: "unavailable",
        checkedAt: new Date().toISOString(),
        message: "对象存储连接测试失败。",
        error: errorMessage(error).slice(0, 500)
      };
    }
  }

  async uploadObject(input: UploadObjectInput) {
    const config = (await this.getConfig()) as StorageConfigInput;
    const provider = providerById(config.providerId || "minio");
    const useSSL = config.useSSL ?? provider?.useSSL ?? true;
    const endpoint = normalizeEndpoint(config.endpoint || provider?.defaultEndpoint, useSSL);
    const region = config.region || provider?.defaultRegion || "auto";
    const bucket = String(config.bucket || provider?.bucketHint || "").trim();
    const accessKeyId = String(config.accessKeyId || "").trim();
    const secretAccessKey = String(config.secretAccessKey || "").trim();

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      throw new Error("对象存储尚未配置完整，请先在系统设置中完成存储检测。");
    }

    const client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      },
      forcePathStyle: config.forcePathStyle ?? provider?.forcePathStyle ?? true
    });

    await this.ensureBucket(client, bucket, config.providerId || "minio");

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const key = `${normalizedPrefix(input.prefix || config.prefix || "uploads/")}documents/${today}/${Date.now()}-${safeFileName(
      input.fileName
    ) || "document"}`;

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: input.buffer,
        ContentType: input.contentType || "application/octet-stream"
      })
    );

    return {
      providerId: config.providerId || "minio",
      providerName: config.providerName || provider?.name || config.providerId || "minio",
      endpoint,
      bucket,
      region,
      key
    };
  }

  async readObjectText(key: string) {
    const config = (await this.getConfig()) as StorageConfigInput;
    const provider = providerById(config.providerId || "minio");
    const useSSL = config.useSSL ?? provider?.useSSL ?? true;
    const endpoint = normalizeEndpoint(config.endpoint || provider?.defaultEndpoint, useSSL);
    const region = config.region || provider?.defaultRegion || "auto";
    const bucket = String(config.bucket || provider?.bucketHint || "").trim();
    const accessKeyId = String(config.accessKeyId || "").trim();
    const secretAccessKey = String(config.secretAccessKey || "").trim();

    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      throw new Error("对象存储尚未配置完整，请先在系统设置中完成存储检测。");
    }

    const client = new S3Client({
      endpoint,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey
      },
      forcePathStyle: config.forcePathStyle ?? provider?.forcePathStyle ?? true
    });

    const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    return response.Body?.transformToString("utf-8") ?? "";
  }

  private async ensureBucket(client: S3Client, bucket: string, providerId: string) {
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      if (providerId !== "minio") {
        throw new Error(`Bucket ${bucket} 不存在或当前密钥无权访问。`);
      }
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
    }
  }
}
