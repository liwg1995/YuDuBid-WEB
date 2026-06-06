import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { Job } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";

interface BidkitTaskJob {
  taskId: string;
  projectId?: string;
  payload: Record<string, unknown>;
}

@Injectable()
@Processor("bidkit-tasks")
export class TasksProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly storageService: StorageService
  ) {
    super();
  }

  async process(job: Job<BidkitTaskJob>) {
    await this.prisma.aiTask.update({
      where: { id: job.data.taskId },
      data: {
        status: "running",
        progress: 20
      }
    });

    await job.updateProgress(60);

    if (job.name === "tender_parse") {
      await this.processTenderParse(job);
      return;
    }

    if (job.name === "risk_check" || job.name === "duplicate_check") {
      await this.processCheckTask(job);
      return;
    }

    await this.prisma.aiTask.update({
      where: { id: job.data.taskId },
      data: {
        status: "success",
        progress: 100,
        result: {
          jobName: job.name,
          message: "任务处理器已接入。后续将在这里调用文档解析、AI 生成或风险检查服务。"
        }
      }
    });
  }

  private async processTenderParse(job: Job<BidkitTaskJob>) {
    const documentId = String(job.data.payload.documentId || "");
    const storageKey = String(job.data.payload.storageKey || "");
    const parser = String(job.data.payload.parser || "auto");

    if (documentId) {
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: "parsing" }
      });
    }

    const workerUrl = this.config.get<string>("DOCUMENT_WORKER_URL", "http://localhost:8100").replace(/\/+$/, "");
    const storage = await this.storageService.getConfig();
    const response = await fetch(`${workerUrl}/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storage_key: storageKey,
        parser,
        file_name: String(job.data.payload.fileName || ""),
        mime_type: String(job.data.payload.mimeType || ""),
        storage
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      const message = `文档解析服务请求失败：${response.status} ${detail.slice(0, 500)}`;
      await this.markTaskFailed(job.data.taskId, documentId, message);
      return;
    }

    const result = (await response.json()) as Record<string, unknown>;

    if (documentId) {
      const metadata: Prisma.InputJsonObject = {
        documentId,
        storageKey,
        fileName: String(job.data.payload.fileName || ""),
        parser,
        workerStatus: String(result.status || ""),
        markdownPreview: typeof result.markdown === "string" ? result.markdown.slice(0, 2000) : "",
        workerMessage: String(result.message || ""),
        stats: (result.stats || {}) as Prisma.InputJsonObject
      };

      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          status: "parsed",
          markdownKey: typeof result.markdown_key === "string" ? result.markdown_key : null,
          metadata
        }
      });
    }

    const analysisResult = await this.tryExtractTenderAnalysis(documentId, job.data.projectId);

    await job.updateProgress(100);
    await this.prisma.aiTask.update({
      where: { id: job.data.taskId },
      data: {
        status: "success",
        progress: 100,
        result: {
          ...(result as Record<string, unknown>),
          analysis: analysisResult
        } as unknown as Prisma.InputJsonObject
      }
    });
  }

  private async tryExtractTenderAnalysis(documentId: string, projectId?: string) {
    if (!documentId) return null;
    const apiPort = this.config.get<string>("API_PORT", "4000");
    try {
      const response = await fetch(`http://localhost:${apiPort}/api/tender-analysis/extract`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, projectId })
      });
      if (!response.ok) {
        return {
          status: "skipped",
          error: `结构化提取接口返回 ${response.status}`
        };
      }
      return (await response.json()) as Record<string, unknown>;
    } catch (error) {
      return {
        status: "skipped",
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  private async processCheckTask(job: Job<BidkitTaskJob>) {
    const apiPort = this.config.get<string>("API_PORT", "4000");
    const endpoint = job.name === "risk_check" ? "risk-check/run-now" : "duplicate-check/run-now";
    await job.updateProgress(70);

    try {
      const response = await fetch(`http://localhost:${apiPort}/api/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...job.data.payload,
          projectId: job.data.projectId || job.data.payload.projectId,
          taskId: job.data.taskId
        })
      });

      if (!response.ok) {
        const detail = await response.text();
        await this.markTaskFailed(job.data.taskId, "", `检查任务执行失败：${response.status} ${detail.slice(0, 500)}`);
        return;
      }

      const result = (await response.json()) as Record<string, unknown>;
      await job.updateProgress(100);
      await this.prisma.aiTask.update({
        where: { id: job.data.taskId },
        data: {
          status: "success",
          progress: 100,
          result: result as unknown as Prisma.InputJsonObject
        }
      });
    } catch (error) {
      await this.markTaskFailed(job.data.taskId, "", error instanceof Error ? error.message : String(error));
    }
  }

  private async markTaskFailed(taskId: string, documentId: string, message: string) {
    if (documentId) {
      await this.prisma.document.update({
        where: { id: documentId },
        data: { status: "parse_failed" }
      });
    }

    await this.prisma.aiTask.update({
      where: { id: taskId },
      data: {
        status: "error",
        progress: 100,
        error: message
      }
    });
  }
}
