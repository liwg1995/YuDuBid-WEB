import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { aiProviderCatalog } from "@yudu-bidkit/shared";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  temperature?: number;
  responseFormat?: "text" | "json";
}

interface OpenAiLikeResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

interface ProviderConnection {
  providerId: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  capability: "text" | "vision" | "image";
  extraHeaders?: Record<string, string>;
}

interface OpenAiLikeModelsResponse {
  data?: Array<{
    id?: string;
    object?: string;
    owned_by?: string;
  }>;
}

function normalizeBaseUrl(value: string | undefined, fallback = "") {
  return String(value || fallback || "").trim().replace(/\/+$/, "");
}

function providerById(providerId: string) {
  return aiProviderCatalog.find((provider) => provider.id === providerId);
}

function fallbackModels(providerId: string, capability: ProviderConnection["capability"]) {
  const provider = providerById(providerId);
  if (!provider) return [];
  if (capability === "image") return [...provider.imageModels];
  return [...provider.textModels];
}

@Injectable()
export class AiService {
  constructor(private readonly config: ConfigService) {}

  listProviders() {
    const enabledProvider = this.config.get<string>("OPENAI_LIKE_PROVIDER", "custom");
    return aiProviderCatalog.map((provider) => ({
      ...provider,
      enabled: provider.id === enabledProvider && Boolean(this.config.get("OPENAI_LIKE_API_KEY"))
    }));
  }

  async chat(request: ChatRequest) {
    const apiKey = this.config.get<string>("OPENAI_LIKE_API_KEY", "");
    const baseUrl = this.config.get<string>("OPENAI_LIKE_BASE_URL", "https://api.openai.com/v1").replace(/\/+$/, "");
    const model = this.config.get<string>("OPENAI_LIKE_MODEL", "gpt-4o-mini");

    if (!apiKey) {
      return {
        provider: "openai-like",
        model,
        configured: false,
        messageCount: request.messages.length,
        content: "尚未配置 OPENAI_LIKE_API_KEY。模型适配层已就绪，配置密钥后将调用 Chat Completions 接口。"
      };
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: request.messages,
        temperature: request.temperature ?? 0.4,
        response_format: request.responseFormat === "json" ? { type: "json_object" } : undefined
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OpenAI-like 请求失败：${response.status} ${detail.slice(0, 500)}`);
    }

    const data = (await response.json()) as OpenAiLikeResponse;
    const content = data.choices?.[0]?.message?.content ?? "";

    return {
      provider: "openai-like",
      model,
      configured: true,
      messageCount: request.messages.length,
      usage: data.usage ?? null,
      content
    };
  }

  async listModels(input: ProviderConnection) {
    const provider = providerById(input.providerId);
    const baseUrl = normalizeBaseUrl(input.baseUrl, provider?.defaultBaseUrl);
    const fallback = fallbackModels(input.providerId, input.capability);

    if (!baseUrl || !input.apiKey) {
      return {
        providerId: input.providerId,
        status: "fallback",
        models: fallback,
        message: "未填写 Base URL 或 API Key，已返回预置模型列表。"
      };
    }

    try {
      const response = await fetch(`${baseUrl}/models`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${input.apiKey}`,
          ...input.extraHeaders
        }
      });

      if (!response.ok) {
        return {
          providerId: input.providerId,
          status: "fallback",
          models: fallback,
          error: `模型列表接口返回 ${response.status}`,
          message: "该厂商可能不支持 OpenAI-like /models，已返回预置模型列表。"
        };
      }

      const data = (await response.json()) as OpenAiLikeModelsResponse;
      const models = (data.data || [])
        .map((item) => item.id)
        .filter((id): id is string => Boolean(id));

      return {
        providerId: input.providerId,
        status: models.length ? "success" : "fallback",
        models: models.length ? models : fallback,
        message: models.length ? "模型列表同步成功。" : "模型列表为空，已返回预置模型列表。"
      };
    } catch (error) {
      return {
        providerId: input.providerId,
        status: "fallback",
        models: fallback,
        error: error instanceof Error ? error.message : String(error),
        message: "模型列表同步失败，已返回预置模型列表。"
      };
    }
  }

  async testConnection(input: ProviderConnection) {
    const provider = providerById(input.providerId);
    const baseUrl = normalizeBaseUrl(input.baseUrl, provider?.defaultBaseUrl);
    const model = input.model || fallbackModels(input.providerId, input.capability)[0];

    if (!baseUrl || !input.apiKey || !model) {
      return {
        providerId: input.providerId,
        status: "unavailable",
        message: "请填写 Base URL、API Key 和模型名称后再测试。"
      };
    }

    if (input.capability === "image") {
      return this.testImageConnection(input, baseUrl, model);
    }

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${input.apiKey}`,
          ...input.extraHeaders
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "你是一个连接测试助手。" },
            { role: "user", content: "请只回复 OK。" }
          ],
          temperature: 0,
          max_tokens: 8
        })
      });

      if (!response.ok) {
        const detail = await response.text();
        return {
          providerId: input.providerId,
          model,
          status: "unavailable",
          message: `测试失败：${response.status}`,
          error: detail.slice(0, 500)
        };
      }

      const data = (await response.json()) as OpenAiLikeResponse;
      return {
        providerId: input.providerId,
        model,
        status: "available",
        message: "文本模型连接测试成功。",
        usage: data.usage ?? null
      };
    } catch (error) {
      return {
        providerId: input.providerId,
        model,
        status: "unavailable",
        message: "文本模型连接测试失败。",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async testImageConnection(input: ProviderConnection, baseUrl: string, model: string) {
    try {
      const response = await fetch(`${baseUrl}/images/generations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${input.apiKey}`,
          ...input.extraHeaders
        },
        body: JSON.stringify({
          model,
          prompt: "A simple blue check mark icon on white background",
          size: "256x256",
          n: 1
        })
      });

      if (!response.ok) {
        const detail = await response.text();
        return {
          providerId: input.providerId,
          model,
          status: "unavailable",
          message: `生图模型测试失败：${response.status}`,
          error: detail.slice(0, 500)
        };
      }

      return {
        providerId: input.providerId,
        model,
        status: "available",
        message: "生图模型连接测试成功。"
      };
    } catch (error) {
      return {
        providerId: input.providerId,
        model,
        status: "unavailable",
        message: "生图模型连接测试失败。",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}
