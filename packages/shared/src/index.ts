export const product = {
  zhName: "禹都投标AI助手",
  enName: "YuDu_Bidkit",
  apiPrefix: "/api"
} as const;

export const taskTypes = [
  "tender_parse",
  "outline_generate",
  "content_generate",
  "risk_check",
  "duplicate_check"
] as const;

export type TaskType = (typeof taskTypes)[number];

export interface ProjectSummary {
  id: string;
  name: string;
  ownerName?: string | null;
  tenderName?: string | null;
  status: string;
  updatedAt: string;
}

export interface TaskSnapshot {
  id: string;
  projectId?: string | null;
  type: TaskType;
  status: "queued" | "running" | "success" | "error" | string;
  progress: number;
}

export const aiProviderCatalog = [
  {
    id: "openai",
    name: "OpenAI",
    region: "global",
    defaultBaseUrl: "https://api.openai.com/v1",
    textModels: ["gpt-4.1", "gpt-4o", "gpt-4o-mini"],
    imageModels: ["gpt-image-1", "dall-e-3"],
    capabilities: ["text", "vision", "image"]
  },
  {
    id: "azure-openai",
    name: "Azure OpenAI",
    region: "global",
    defaultBaseUrl: "https://{resource}.openai.azure.com/openai/deployments/{deployment}",
    textModels: ["gpt-4.1", "gpt-4o"],
    imageModels: ["gpt-image-1"],
    capabilities: ["text", "vision", "image"]
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    region: "cn",
    defaultBaseUrl: "https://api.deepseek.com/v1",
    textModels: ["deepseek-chat", "deepseek-reasoner"],
    imageModels: [],
    capabilities: ["text"]
  },
  {
    id: "dashscope",
    name: "阿里云百炼 / 通义千问",
    region: "cn",
    defaultBaseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    textModels: ["qwen-max", "qwen-plus", "qwen-turbo", "qwen-vl-plus"],
    imageModels: ["wanx2.1-t2i-turbo"],
    capabilities: ["text", "vision", "image"]
  },
  {
    id: "zhipu",
    name: "智谱 AI",
    region: "cn",
    defaultBaseUrl: "https://open.bigmodel.cn/api/paas/v4",
    textModels: ["glm-4-plus", "glm-4-air", "glm-4-flash"],
    imageModels: ["cogview-3-plus"],
    capabilities: ["text", "image"]
  },
  {
    id: "moonshot",
    name: "月之暗面 Kimi",
    region: "cn",
    defaultBaseUrl: "https://api.moonshot.cn/v1",
    textModels: ["moonshot-v1-8k", "moonshot-v1-32k", "moonshot-v1-128k"],
    imageModels: [],
    capabilities: ["text"]
  },
  {
    id: "volcengine",
    name: "火山方舟",
    region: "cn",
    defaultBaseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    textModels: ["doubao-1.5-pro-32k", "deepseek-v3", "deepseek-r1"],
    imageModels: ["doubao-seedream-3-0-t2i"],
    capabilities: ["text", "vision", "image"]
  },
  {
    id: "hunyuan",
    name: "腾讯混元",
    region: "cn",
    defaultBaseUrl: "https://api.hunyuan.cloud.tencent.com/v1",
    textModels: ["hunyuan-turbos", "hunyuan-large"],
    imageModels: ["hunyuan-image"],
    capabilities: ["text", "image"]
  },
  {
    id: "qianfan",
    name: "百度千帆",
    region: "cn",
    defaultBaseUrl: "https://qianfan.baidubce.com/v2",
    textModels: ["ernie-4.0-turbo-8k", "ernie-speed-128k"],
    imageModels: ["irag-1.0"],
    capabilities: ["text", "image"]
  },
  {
    id: "google-ai-studio",
    name: "Google AI Studio / Gemini",
    region: "global",
    defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    textModels: ["gemini-2.0-flash", "gemini-1.5-pro"],
    imageModels: ["imagen-3.0-generate-002"],
    capabilities: ["text", "vision", "image"]
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    region: "global",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    textModels: ["anthropic/claude-3.5-sonnet", "openai/gpt-4o", "google/gemini-pro"],
    imageModels: [],
    capabilities: ["text", "vision"]
  },
  {
    id: "ollama",
    name: "Ollama 本地模型",
    region: "local",
    defaultBaseUrl: "http://localhost:11434/v1",
    textModels: ["qwen2.5:14b", "llama3.1:8b", "deepseek-r1:14b"],
    imageModels: [],
    capabilities: ["text"]
  },
  {
    id: "lm-studio",
    name: "LM Studio 本地模型",
    region: "local",
    defaultBaseUrl: "http://localhost:1234/v1",
    textModels: ["local-model"],
    imageModels: [],
    capabilities: ["text"]
  },
  {
    id: "custom",
    name: "自定义 OpenAI-like",
    region: "custom",
    defaultBaseUrl: "",
    textModels: [],
    imageModels: [],
    capabilities: ["text", "vision", "image"]
  }
] as const;

export type AiProviderId = (typeof aiProviderCatalog)[number]["id"];
export type AiCapability = "text" | "vision" | "image";

export const storageProviderCatalog = [
  {
    id: "minio",
    name: "内置 MinIO",
    region: "local",
    protocol: "s3-compatible",
    defaultEndpoint: "http://localhost:9000",
    defaultRegion: "local",
    bucketHint: "bidkit",
    endpointHint: "Docker Compose 内置 MinIO 服务地址",
    forcePathStyle: true,
    useSSL: false
  },
  {
    id: "aliyun-oss",
    name: "阿里云 OSS",
    region: "cn",
    protocol: "s3-compatible",
    defaultEndpoint: "https://oss-cn-hangzhou.aliyuncs.com",
    defaultRegion: "cn-hangzhou",
    bucketHint: "your-oss-bucket",
    endpointHint: "https://oss-{region}.aliyuncs.com",
    forcePathStyle: false,
    useSSL: true
  },
  {
    id: "tencent-cos",
    name: "腾讯云 COS",
    region: "cn",
    protocol: "s3-compatible",
    defaultEndpoint: "https://cos.ap-guangzhou.myqcloud.com",
    defaultRegion: "ap-guangzhou",
    bucketHint: "your-cos-bucket-appid",
    endpointHint: "https://cos.{region}.myqcloud.com",
    forcePathStyle: false,
    useSSL: true
  },
  {
    id: "huawei-obs",
    name: "华为云 OBS",
    region: "cn",
    protocol: "s3-compatible",
    defaultEndpoint: "https://obs.cn-north-4.myhuaweicloud.com",
    defaultRegion: "cn-north-4",
    bucketHint: "your-obs-bucket",
    endpointHint: "https://obs.{region}.myhuaweicloud.com",
    forcePathStyle: false,
    useSSL: true
  },
  {
    id: "qiniu-kodo",
    name: "七牛云 Kodo",
    region: "cn",
    protocol: "s3-compatible",
    defaultEndpoint: "https://s3-cn-east-1.qiniucs.com",
    defaultRegion: "cn-east-1",
    bucketHint: "your-kodo-bucket",
    endpointHint: "https://s3-{region}.qiniucs.com",
    forcePathStyle: true,
    useSSL: true
  },
  {
    id: "aws-s3",
    name: "AWS S3",
    region: "global",
    protocol: "s3-compatible",
    defaultEndpoint: "https://s3.amazonaws.com",
    defaultRegion: "us-east-1",
    bucketHint: "your-s3-bucket",
    endpointHint: "https://s3.{region}.amazonaws.com",
    forcePathStyle: false,
    useSSL: true
  },
  {
    id: "cloudflare-r2",
    name: "Cloudflare R2",
    region: "global",
    protocol: "s3-compatible",
    defaultEndpoint: "",
    defaultRegion: "auto",
    bucketHint: "your-r2-bucket",
    endpointHint: "https://<account-id>.r2.cloudflarestorage.com",
    forcePathStyle: true,
    useSSL: true
  },
  {
    id: "backblaze-b2",
    name: "Backblaze B2",
    region: "global",
    protocol: "s3-compatible",
    defaultEndpoint: "",
    defaultRegion: "us-west-004",
    bucketHint: "your-b2-bucket",
    endpointHint: "https://s3.<region>.backblazeb2.com",
    forcePathStyle: true,
    useSSL: true
  },
  {
    id: "custom-s3",
    name: "自定义 S3 兼容存储",
    region: "custom",
    protocol: "s3-compatible",
    defaultEndpoint: "",
    defaultRegion: "auto",
    bucketHint: "your-bucket",
    endpointHint: "填写对象存储 S3 endpoint",
    forcePathStyle: true,
    useSSL: true
  }
] as const;

export type StorageProviderId = (typeof storageProviderCatalog)[number]["id"];
