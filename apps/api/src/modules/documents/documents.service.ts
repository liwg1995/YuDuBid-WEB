import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { TasksService } from "../tasks/tasks.service";

interface ParseDocumentInput {
  projectId?: string;
  documentId?: string;
  storageKey?: string;
  parser?: "auto" | "docx" | "pdf" | "mineru";
}

interface UploadDocumentInput {
  projectId?: string;
  projectName?: string;
  role?: string;
  parser?: "auto" | "docx" | "pdf" | "mineru";
  file: Express.Multer.File;
}

interface DocumentWorkerParseResponse {
  status: string;
  storage_key: string;
  parser: string;
  markdown?: string;
  message?: string;
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly tasksService: TasksService
  ) {}

  list(projectId?: string) {
    return this.prisma.document.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    });
  }

  async upload(input: UploadDocumentInput) {
    const storage = await this.storageService.uploadObject({
      buffer: input.file.buffer,
      fileName: input.file.originalname,
      contentType: input.file.mimetype
    });

    const projectId = input.projectId || (await this.createProjectFromFile(input.projectName, input.file.originalname));

    const metadata = {
      size: input.file.size,
      parser: input.parser || "auto",
      providerId: storage.providerId,
      providerName: storage.providerName,
      bucket: storage.bucket,
      region: storage.region,
      endpoint: storage.endpoint
    } satisfies Prisma.InputJsonObject;

    const document = await this.prisma.document.create({
      data: {
        projectId,
        role: input.role || "tender",
        fileName: input.file.originalname,
        mimeType: input.file.mimetype,
        storageKey: storage.key,
        status: "uploaded",
        metadata
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            status: true
          }
        }
      }
    });

    const task = await this.tasksService.enqueue({
      projectId,
      type: "tender_parse",
      payload: {
        documentId: document.id,
        storageKey: document.storageKey,
        fileName: document.fileName,
        mimeType: document.mimeType || "",
        parser: input.parser || "auto"
      }
    });

    return {
      document,
      task,
      message: "文件已上传，解析任务已进入队列。"
    };
  }

  async getMarkdown(documentId: string) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId }
    });

    if (!document) {
      return {
        status: "not_found",
        markdown: "",
        message: "文档不存在。"
      };
    }

    if (!document.markdownKey) {
      const metadata = document.metadata as { markdownPreview?: string } | null;
      return {
        status: document.status,
        documentId: document.id,
        markdownKey: null,
        markdown: metadata?.markdownPreview || "",
        message: "Markdown 中间态尚未生成。"
      };
    }

    const markdown = await this.storageService.readObjectText(document.markdownKey);
    return {
      status: document.status,
      documentId: document.id,
      markdownKey: document.markdownKey,
      markdown,
      message: "Markdown 中间态读取成功。"
    };
  }

  async requestParse(input: ParseDocumentInput) {
    const workerUrl = this.config.get<string>("DOCUMENT_WORKER_URL", "http://localhost:8100").replace(/\/+$/, "");
    const storageKey = input.storageKey ?? input.documentId;

    if (!storageKey) {
      return {
        status: "missing_storage_key",
        projectId: input.projectId,
        documentId: input.documentId,
        message: "请先上传文件并提供 storageKey 或 documentId。"
      };
    }

    const response = await fetch(`${workerUrl}/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storage_key: storageKey,
        parser: input.parser ?? "auto"
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`文档解析服务请求失败：${response.status} ${detail.slice(0, 500)}`);
    }

    const data = (await response.json()) as DocumentWorkerParseResponse;
    return {
      status: data.status,
      projectId: input.projectId,
      documentId: input.documentId,
      storageKey: data.storage_key,
      parser: data.parser,
      markdown: data.markdown ?? "",
      message: data.message ?? "文档解析请求已提交。"
    };
  }

  private async createProjectFromFile(projectName: string | undefined, fileName: string) {
    const fallbackName = fileName.replace(/\.[^.]+$/, "") || "未命名投标项目";
    const project = await this.prisma.project.create({
      data: {
        name: projectName?.trim() || fallbackName,
        tenderName: fileName,
        status: "draft"
      }
    });
    return project.id;
  }
}
