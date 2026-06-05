"use client";

import { useEffect, useMemo, useState } from "react";
import { aiProviderCatalog, storageProviderCatalog } from "@yudu-bidkit/shared";
import {
  Bot,
  BrainCircuit,
  CheckCircle2,
  Database,
  Eye,
  Globe2,
  HardDrive,
  Image,
  KeyRound,
  Layers3,
  Paintbrush,
  PlugZap,
  Save,
  Server,
  ShieldCheck,
  SlidersHorizontal
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

const regionLabels: Record<string, string> = {
  cn: "国内服务",
  global: "国际服务",
  local: "本地模型",
  custom: "自定义"
};

const capabilityLabels: Record<string, string> = {
  text: "文本",
  vision: "视觉",
  image: "生图"
};

const textProviderIds = ["openai", "deepseek", "dashscope", "zhipu", "moonshot", "volcengine", "ollama", "custom"];
const imageProviderIds = ["openai", "dashscope", "zhipu", "volcengine", "hunyuan", "qianfan", "google-ai-studio", "custom"];

interface ModelConfig {
  providerId: string;
  providerName?: string;
  baseUrl: string;
  apiKey?: string;
  model: string;
  status?: string;
  temperature?: number;
  maxTokens?: number;
  size?: string;
}

interface AppConfig {
  textModel: ModelConfig;
  imageModel: ModelConfig;
  visionModel: ModelConfig;
  documentParser: Record<string, unknown>;
  storage: StorageConfig;
}

interface StorageConfig {
  providerId: string;
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

function providerName(providerId: string) {
  return aiProviderCatalog.find((item) => item.id === providerId)?.name || providerId;
}

function providerBaseUrl(providerId: string) {
  return aiProviderCatalog.find((item) => item.id === providerId)?.defaultBaseUrl || "";
}

function providerTextModels(providerId: string) {
  return [...(aiProviderCatalog.find((item) => item.id === providerId)?.textModels || [])];
}

function providerImageModels(providerId: string) {
  return [...(aiProviderCatalog.find((item) => item.id === providerId)?.imageModels || [])];
}

function storageProviderName(providerId: string) {
  return storageProviderCatalog.find((item) => item.id === providerId)?.name || providerId;
}

function storageProviderByName(name: string) {
  return storageProviderCatalog.find((item) => item.name === name);
}

function defaultModel(providerId: string, capability: "text" | "image") {
  const models = capability === "image" ? providerImageModels(providerId) : providerTextModels(providerId);
  return models[0] || "";
}

function Field({
  label,
  value,
  placeholder,
  type = "text",
  onChange
}: {
  label: string;
  value?: string | number;
  placeholder?: string;
  type?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <input
        className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        type={type}
        value={value ?? ""}
      />
    </label>
  );
}

function SelectField({
  label,
  options,
  value,
  onChange
}: {
  label: string;
  options: string[];
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium">{label}</span>
      <select
        className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring"
        onChange={(event) => onChange?.(event.target.value)}
        value={value ?? options[0] ?? ""}
      >
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onChange
}: {
  label: string;
  description?: string;
  checked?: boolean;
  onChange?: (value: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-lg border border-border bg-white p-3">
      <input
        checked={Boolean(checked)}
        className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-ring"
        onChange={(event) => onChange?.(event.target.checked)}
        type="checkbox"
      />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        {description && <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>}
      </span>
    </label>
  );
}

function ProviderCard({ providerId, active = false }: { providerId: string; active?: boolean }) {
  const provider = aiProviderCatalog.find((item) => item.id === providerId);
  if (!provider) return null;

  return (
    <article className={cn("rounded-lg border border-border bg-white p-4", active && "border-primary bg-sky-50")}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <strong className="text-sm">{provider.name}</strong>
          <p className="mt-1 text-xs text-muted-foreground">{regionLabels[provider.region]}</p>
        </div>
        {active && <CheckCircle2 className="h-5 w-5 text-primary" />}
      </div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {provider.capabilities.map((capability) => (
          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-muted-foreground" key={capability}>
            {capabilityLabels[capability]}
          </span>
        ))}
      </div>
      <p className="line-clamp-1 text-xs text-muted-foreground">{provider.defaultBaseUrl || "按你的服务商接口填写 Base URL"}</p>
    </article>
  );
}

export default function SettingsPage() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [textModels, setTextModels] = useState<string[]>([]);
  const [imageModels, setImageModels] = useState<string[]>([]);
  const [message, setMessage] = useState("正在读取配置...");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  useEffect(() => {
    void fetch(`${apiBaseUrl}/api/system-config`)
      .then((response) => response.json())
      .then((data: AppConfig) => {
        setConfig(data);
        setTextModels(providerTextModels(data.textModel.providerId));
        setImageModels(providerImageModels(data.imageModel.providerId));
        setMessage("配置已载入。");
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : String(error)));
  }, []);

  const textProviderOptions = useMemo(() => textProviderIds.map(providerName), []);
  const imageProviderOptions = useMemo(() => imageProviderIds.map(providerName), []);
  const storageProviderOptions = useMemo(() => storageProviderCatalog.map((provider) => provider.name), []);

  function updateModel(kind: "textModel" | "imageModel" | "visionModel", patch: Partial<ModelConfig>) {
    setConfig((current) => {
      if (!current) return current;
      return {
        ...current,
        [kind]: {
          ...current[kind],
          ...patch
        }
      };
    });
  }

  function selectProvider(kind: "textModel" | "imageModel", name: string) {
    const provider = aiProviderCatalog.find((item) => item.name === name);
    if (!provider) return;
    const capability = kind === "imageModel" ? "image" : "text";
    const model = defaultModel(provider.id, capability);
    updateModel(kind, {
      providerId: provider.id,
      providerName: provider.name,
      baseUrl: provider.defaultBaseUrl,
      model
    });
    if (kind === "textModel") setTextModels(providerTextModels(provider.id));
    if (kind === "imageModel") setImageModels(providerImageModels(provider.id));
  }

  function updateStorage(patch: Partial<StorageConfig>) {
    setConfig((current) => {
      if (!current) return current;
      return {
        ...current,
        storage: {
          ...current.storage,
          ...patch
        }
      };
    });
  }

  function selectStorageProvider(name: string) {
    const provider = storageProviderByName(name);
    if (!provider) return;
    updateStorage({
      providerId: provider.id,
      providerName: provider.name,
      endpoint: provider.defaultEndpoint,
      region: provider.defaultRegion,
      bucket: provider.id === "minio" ? provider.bucketHint : "",
      forcePathStyle: provider.forcePathStyle,
      useSSL: provider.useSSL,
      status: "untested"
    });
  }

  async function saveConfig() {
    if (!config) return;
    setBusyAction("save");
    try {
      const response = await fetch(`${apiBaseUrl}/api/system-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config)
      });
      const data = (await response.json()) as AppConfig;
      setConfig(data);
      setMessage("配置已保存。");
    } finally {
      setBusyAction(null);
    }
  }

  async function syncModels(kind: "textModel" | "imageModel") {
    if (!config) return;
    const modelConfig = config[kind];
    const capability = kind === "imageModel" ? "image" : "text";
    setBusyAction(`${kind}:models`);
    try {
      const response = await fetch(`${apiBaseUrl}/api/ai/models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: modelConfig.providerId,
          baseUrl: modelConfig.baseUrl,
          apiKey: modelConfig.apiKey,
          capability
        })
      });
      const data = (await response.json()) as { models: string[]; message: string };
      if (kind === "textModel") setTextModels(data.models);
      if (kind === "imageModel") setImageModels(data.models);
      if (data.models[0] && !data.models.includes(modelConfig.model)) {
        updateModel(kind, { model: data.models[0] });
      }
      setMessage(data.message);
    } finally {
      setBusyAction(null);
    }
  }

  async function testModel(kind: "textModel" | "imageModel") {
    if (!config) return;
    const modelConfig = config[kind];
    const capability = kind === "imageModel" ? "image" : "text";
    setBusyAction(`${kind}:test`);
    try {
      const response = await fetch(`${apiBaseUrl}/api/ai/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: modelConfig.providerId,
          baseUrl: modelConfig.baseUrl,
          apiKey: modelConfig.apiKey,
          model: modelConfig.model,
          capability
        })
      });
      const data = (await response.json()) as { status: string; message: string };
      updateModel(kind, { status: data.status });
      setMessage(data.message);
    } finally {
      setBusyAction(null);
    }
  }

  async function testStorage() {
    if (!config) return;
    setBusyAction("storage:test");
    try {
      const response = await fetch(`${apiBaseUrl}/api/storage/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config.storage)
      });
      const data = (await response.json()) as { status: string; message: string; error?: string };
      updateStorage({ status: data.status });
      setMessage(data.error ? `${data.message} ${data.error}` : data.message);
    } finally {
      setBusyAction(null);
    }
  }

  const textModel = config?.textModel;
  const imageModel = config?.imageModel;
  const storage = config?.storage;

  return (
    <AppShell active="/settings">
      <PageHeader actionLabel="保存配置" description="配置文本模型、生图模型、视觉模型、文档解析和自定义 OpenAI-like 服务。" title="系统设置" />

      <div className="mb-6 rounded-lg border border-border bg-white px-4 py-3 text-sm text-muted-foreground shadow-soft">
        {message}
      </div>

      <section className="mb-6 grid gap-4 md:grid-cols-4">
        {[
          { icon: Bot, label: "文本模型", value: "DeepSeek / Qwen / GPT", state: textModel?.status || "untested" },
          { icon: Image, label: "生图模型", value: "火山 / 通义 / Gemini", state: imageModel?.status || "untested" },
          { icon: Eye, label: "视觉模型", value: "图文理解", state: config?.visionModel?.status || "untested" },
          { icon: Server, label: "本地模型", value: "Ollama / LM Studio", state: "可配置" }
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <item.icon className="mb-3 h-5 w-5 text-primary" />
              <span className="block text-sm font-medium">{item.label}</span>
              <strong className="mt-2 block text-lg">{item.value}</strong>
              <p className="mt-1 text-xs text-muted-foreground">{item.state}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>文本模型配置</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">用于招标解析、目录生成、正文生成、废标检查和查重分析。</p>
              </div>
              <BrainCircuit className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {textProviderIds.map((id) => (
                  <ProviderCard active={id === textModel?.providerId} key={id} providerId={id} />
                ))}
              </div>
              {textModel && (
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField label="当前文本服务商" onChange={(value) => selectProvider("textModel", value)} options={textProviderOptions} value={providerName(textModel.providerId)} />
                  <SelectField label="文本模型" onChange={(value) => updateModel("textModel", { model: value })} options={textModels.length ? textModels : [textModel.model || "custom-model"]} value={textModel.model} />
                  <Field label="Base URL" onChange={(value) => updateModel("textModel", { baseUrl: value })} value={textModel.baseUrl} />
                  <Field label="API Key" onChange={(value) => updateModel("textModel", { apiKey: value })} placeholder="sk-..." type="password" value={textModel.apiKey || ""} />
                  <Field label="温度 temperature" onChange={(value) => updateModel("textModel", { temperature: Number(value) })} value={textModel.temperature ?? 0.4} />
                  <Field label="最大输出 tokens" onChange={(value) => updateModel("textModel", { maxTokens: Number(value) })} value={textModel.maxTokens ?? 8192} />
                </div>
              )}
              <div className="rounded-lg bg-slate-50 p-4">
                <div className="mb-3 flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                  <strong className="text-sm">高级参数</strong>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field label="JSON 模式参数" value='{"type":"json_object"}' />
                  <Field label="请求超时" value="300000" />
                  <Field label="并发任务数" value="3" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button disabled={busyAction === "textModel:test"} onClick={() => testModel("textModel")}>
                  <KeyRound className="h-4 w-4" />
                  测试文本模型
                </Button>
                <Button disabled={busyAction === "textModel:models"} onClick={() => syncModels("textModel")} variant="outline">
                  <PlugZap className="h-4 w-4" />
                  同步模型列表
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>生图模型配置</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">用于技术方案插图、流程图风格化、投标文件配图和封面素材。</p>
              </div>
              <Paintbrush className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {imageProviderIds.map((id) => (
                  <ProviderCard active={id === imageModel?.providerId} key={id} providerId={id} />
                ))}
              </div>
              {imageModel && (
                <div className="grid gap-4 md:grid-cols-2">
                  <SelectField label="当前生图服务商" onChange={(value) => selectProvider("imageModel", value)} options={imageProviderOptions} value={providerName(imageModel.providerId)} />
                  <SelectField label="生图模型" onChange={(value) => updateModel("imageModel", { model: value })} options={imageModels.length ? imageModels : [imageModel.model || "custom-image-model"]} value={imageModel.model} />
                  <Field label="Base URL" onChange={(value) => updateModel("imageModel", { baseUrl: value })} value={imageModel.baseUrl} />
                  <Field label="API Key" onChange={(value) => updateModel("imageModel", { apiKey: value })} placeholder="用于生图服务的密钥" type="password" value={imageModel.apiKey || ""} />
                  <Field label="默认尺寸" onChange={(value) => updateModel("imageModel", { size: value })} value={imageModel.size || "1024x1024"} />
                  <Field label="默认质量" value="standard" />
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button disabled={busyAction === "imageModel:test"} onClick={() => testModel("imageModel")}>
                  <Image className="h-4 w-4" />
                  测试生图模型
                </Button>
                <Button disabled={busyAction === "imageModel:models"} onClick={() => syncModels("imageModel")} variant="outline">
                  <PlugZap className="h-4 w-4" />
                  同步模型列表
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>国内外场景</CardTitle>
              <Globe2 className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "国内低成本生成", text: "DeepSeek、通义千问、火山方舟、智谱、Kimi" },
                { label: "海外高质量生成", text: "OpenAI、Azure OpenAI、Gemini、OpenRouter" },
                { label: "私有化 / 离线场景", text: "Ollama、LM Studio、自定义内网 OpenAI-like" },
                { label: "图文与插图场景", text: "GPT Image、通义万相、Seedream、Imagen、CogView" }
              ].map((item) => (
                <article className="rounded-lg bg-slate-50 p-4" key={item.label}>
                  <strong className="text-sm">{item.label}</strong>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
                </article>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>文档与视觉解析</CardTitle>
              <Layers3 className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent className="space-y-4">
              <SelectField label="解析服务" options={["Local Python Worker", "MinerU", "OCR Service", "自定义解析服务"]} value="Local Python Worker" />
              <Field label="Document Worker URL" value={String(config?.documentParser?.endpoint || "http://localhost:8100")} />
              <SelectField label="复杂图片解析模型" options={["qwen-vl-plus", "gpt-4o", "gemini-2.0-flash", "自定义视觉模型"]} value={String(config?.visionModel?.model || "qwen-vl-plus")} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>自定义服务</CardTitle>
              <PlugZap className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Field label="自定义厂商名称" placeholder="例如：公司内网模型网关" />
              <Field label="自定义 Base URL" placeholder="https://ai.example.com/v1" />
              <Field label="模型名称" placeholder="custom-large-model" />
              <Field label="额外 Headers JSON" value='{"X-Provider":"YuDu"}' />
              <Button disabled={busyAction === "save"} onClick={saveConfig} variant="secondary">
                <Save className="h-4 w-4" />
                保存全部配置
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>基础设施</CardTitle>
              <Database className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { icon: Database, label: "PostgreSQL", value: "DATABASE_URL" },
                { icon: HardDrive, label: "Redis / BullMQ", value: "REDIS_URL" }
              ].map((item) => (
                <div className="rounded-lg bg-slate-50 p-4" key={item.label}>
                  <div className="mb-2 flex items-center gap-2">
                    <item.icon className="h-4 w-4 text-primary" />
                    <strong className="text-sm">{item.label}</strong>
                  </div>
                  <span className="text-xs text-muted-foreground">{item.value}</span>
                </div>
              ))}

              {storage && (
                <div className="rounded-lg border border-border bg-slate-50 p-4">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <strong className="text-sm">对象存储</strong>
                      <p className="mt-1 text-xs text-muted-foreground">内置 MinIO 或国内外 S3 兼容对象存储。</p>
                    </div>
                    <span
                      className={cn(
                        "rounded-md px-2 py-1 text-xs font-medium",
                        storage.status === "available" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                      )}
                    >
                      {storage.status || "untested"}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <SelectField
                      label="存储厂商"
                      onChange={selectStorageProvider}
                      options={storageProviderOptions}
                      value={storageProviderName(storage.providerId)}
                    />
                    <Field
                      label="Endpoint"
                      onChange={(value) => updateStorage({ endpoint: value })}
                      placeholder={storageProviderCatalog.find((item) => item.id === storage.providerId)?.endpointHint}
                      value={storage.endpoint || ""}
                    />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Region" onChange={(value) => updateStorage({ region: value })} value={storage.region || ""} />
                      <Field label="Bucket" onChange={(value) => updateStorage({ bucket: value })} value={storage.bucket || ""} />
                    </div>
                    <Field
                      label="Access Key"
                      onChange={(value) => updateStorage({ accessKeyId: value })}
                      placeholder="AccessKeyId / SecretId"
                      value={storage.accessKeyId || ""}
                    />
                    <Field
                      label="Secret Key"
                      onChange={(value) => updateStorage({ secretAccessKey: value })}
                      placeholder="SecretAccessKey / SecretKey"
                      type="password"
                      value={storage.secretAccessKey || ""}
                    />
                    <Field
                      label="对象前缀"
                      onChange={(value) => updateStorage({ prefix: value })}
                      placeholder="uploads/"
                      value={storage.prefix || ""}
                    />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <ToggleField
                        checked={storage.forcePathStyle}
                        description="MinIO、R2、B2 和部分兼容服务通常需要开启。"
                        label="Path Style"
                        onChange={(value) => updateStorage({ forcePathStyle: value })}
                      />
                      <ToggleField
                        checked={storage.useSSL}
                        description="公网对象存储建议开启；本地 MinIO 可关闭。"
                        label="HTTPS"
                        onChange={(value) => updateStorage({ useSSL: value })}
                      />
                    </div>
                    <Button disabled={busyAction === "storage:test"} onClick={testStorage} variant="outline">
                      <ShieldCheck className="h-4 w-4" />
                      测试存储连接
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </aside>
      </section>
    </AppShell>
  );
}
