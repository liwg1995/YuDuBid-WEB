import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { TasksService } from "../tasks/tasks.service";

interface RiskCheckInput {
  projectId: string;
  tenderDocumentId?: string;
  bidDocumentId?: string;
  taskId?: string;
}

interface FindingDraft {
  category: string;
  severity: "high" | "medium" | "low";
  title: string;
  summary: string;
  requirement?: string;
  evidence?: string;
  suggestion: string;
  sourceDocumentId?: string;
  metadata?: Prisma.InputJsonObject;
}

const materialKeywords = ["营业执照", "授权书", "承诺函", "保证金", "保函", "资质", "业绩", "人员", "项目经理", "证书", "报价"];
const scheduleKeywords = ["工期", "服务期", "交付期", "质保期", "响应时间"];
const rejectionKeywords = ["废标", "无效", "否决", "实质性响应", "重大偏离", "不予受理"];
const commonTypoPairs = [
  ["项目经里", "项目经理"],
  ["质保其", "质保期"],
  ["响影", "响应"],
  ["投拆", "投诉"],
  ["招标文见", "招标文件"],
  ["服物", "服务"]
];

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function compact(value: string) {
  return normalizeText(value).replace(/[^\p{Script=Han}a-zA-Z0-9]+/gu, "");
}

function excerptAround(content: string, keyword: string, radius = 80) {
  const index = content.indexOf(keyword);
  if (index < 0) return "";
  return normalizeText(content.slice(Math.max(0, index - radius), Math.min(content.length, index + keyword.length + radius)));
}

function findAnyKeyword(content: string, keywords: string[]) {
  return keywords.find((keyword) => content.includes(keyword));
}

function requirementKeyword(requirement: { title: string; content: string }) {
  const text = `${requirement.title}\n${requirement.content}`;
  return (
    findAnyKeyword(text, [...rejectionKeywords, ...materialKeywords, ...scheduleKeywords]) ||
    compact(requirement.title).slice(0, 12) ||
    compact(requirement.content).slice(0, 12)
  );
}

@Injectable()
export class RiskCheckService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly tasksService: TasksService
  ) {}

  enqueue(input: RiskCheckInput) {
    return this.tasksService.enqueue({
      projectId: input.projectId,
      type: "risk_check",
      payload: { ...input }
    });
  }

  list(projectId?: string) {
    return this.prisma.checkRun.findMany({
      where: {
        projectId,
        type: "risk_check"
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        findings: {
          orderBy: { sortOrder: "asc" }
        }
      }
    });
  }

  getRun(id: string) {
    return this.prisma.checkRun.findUnique({
      where: { id },
      include: {
        findings: {
          orderBy: { sortOrder: "asc" }
        }
      }
    });
  }

  async runNow(input: RiskCheckInput) {
    const project = await this.prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project) throw new NotFoundException("项目不存在。");

    const tenderDocument = input.tenderDocumentId
      ? await this.prisma.document.findUnique({ where: { id: input.tenderDocumentId } })
      : await this.prisma.document.findFirst({
          where: { projectId: input.projectId, role: "tender" },
          orderBy: { createdAt: "desc" }
        });

    const bidDocument = input.bidDocumentId
      ? await this.prisma.document.findUnique({ where: { id: input.bidDocumentId } })
      : await this.prisma.document.findFirst({
          where: { projectId: input.projectId, role: "bid" },
          orderBy: { createdAt: "desc" }
        });

    if (!tenderDocument) throw new NotFoundException("请先选择或上传招标文件。");

    const tenderMarkdown = await this.readDocumentMarkdown(tenderDocument.id);
    const bidMarkdown = bidDocument ? await this.readDocumentMarkdown(bidDocument.id) : "";
    const requirements = await this.prisma.tenderRequirement.findMany({
      where: { projectId: input.projectId },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }]
    });

    const findings = this.createFindings({
      projectId: input.projectId,
      tenderDocumentId: tenderDocument.id,
      bidDocumentId: bidDocument?.id,
      tenderMarkdown,
      bidMarkdown,
      requirements
    });

    const severityCounts = findings.reduce<Record<string, number>>((acc, item) => {
      acc[item.severity] = (acc[item.severity] || 0) + 1;
      return acc;
    }, {});

    const run = await this.prisma.$transaction(async (tx) => {
      const created = await tx.checkRun.create({
        data: {
          projectId: input.projectId,
          taskId: input.taskId,
          type: "risk_check",
          status: "ready",
          title: `${project.name} 废标项检查`,
          summary: `发现 ${findings.length} 个需复核问题。`,
          input: {
            tenderDocumentId: tenderDocument.id,
            bidDocumentId: bidDocument?.id || null
          },
          result: {
            checker: "rule-v1",
            severityCounts,
            requirementCount: requirements.length,
            tenderCharCount: tenderMarkdown.length,
            bidCharCount: bidMarkdown.length
          }
        }
      });

      if (findings.length) {
        await tx.checkFinding.createMany({
          data: findings.map((item, index) => ({
            runId: created.id,
            projectId: input.projectId,
            type: "risk_check",
            category: item.category,
            severity: item.severity,
            title: item.title,
            summary: item.summary,
            requirement: item.requirement,
            evidence: item.evidence,
            suggestion: item.suggestion,
            sourceDocumentId: item.sourceDocumentId,
            metadata: item.metadata,
            sortOrder: index
          }))
        });
      }

      return tx.checkRun.findUnique({
        where: { id: created.id },
        include: {
          findings: {
            orderBy: { sortOrder: "asc" }
          }
        }
      });
    });

    return {
      run,
      findingCount: findings.length,
      message: "废标项检查完成。"
    };
  }

  private async readDocumentMarkdown(documentId: string) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document) throw new NotFoundException("文档不存在。");
    if (document.markdownKey) return this.storageService.readObjectText(document.markdownKey);
    const metadata = document.metadata as { markdownPreview?: string } | null;
    return metadata?.markdownPreview || "";
  }

  private createFindings(input: {
    projectId: string;
    tenderDocumentId: string;
    bidDocumentId?: string;
    tenderMarkdown: string;
    bidMarkdown: string;
    requirements: Array<{ category: string; title: string; content: string; severity: string | null }>;
  }) {
    const findings: FindingDraft[] = [];
    const bidCompact = compact(input.bidMarkdown);

    if (!input.bidDocumentId || !input.bidMarkdown.trim()) {
      findings.push({
        category: "document",
        severity: "high",
        title: "未选择投标文件",
        summary: "当前只能完成招标侧风险提取，无法核对投标文件响应情况。",
        evidence: "未读取到投标文件 Markdown 中间态。",
        suggestion: "请上传并解析投标文件后重新执行废标项检查。",
        sourceDocumentId: input.tenderDocumentId
      });
      return findings;
    }

    for (const requirement of input.requirements) {
      if (!["rejection", "qualification", "materials", "business", "schedule"].includes(requirement.category)) continue;
      const keyword = requirementKeyword(requirement);
      if (!keyword || keyword.length < 2) continue;
      const hasResponse = bidCompact.includes(compact(keyword));
      if (hasResponse) continue;

      const isRejection = requirement.category === "rejection";
      const isMaterial = requirement.category === "materials" || findAnyKeyword(`${requirement.title}\n${requirement.content}`, materialKeywords);
      findings.push({
        category: isRejection ? "rejection_item" : isMaterial ? "material_response" : "requirement_response",
        severity: isRejection ? "high" : "medium",
        title: `${keyword} 未发现明确响应`,
        summary: `招标要求涉及“${keyword}”，投标文件中未检索到明确响应线索。`,
        requirement: normalizeText(`${requirement.title} ${requirement.content}`).slice(0, 600),
        evidence: "投标文件 Markdown 中未检索到对应关键词或响应线索。",
        suggestion: isRejection
          ? "请人工核对该条是否属于实质性废标风险，并在投标文件中补充明确响应或证明材料。"
          : "请检查对应章节、附件或承诺表，必要时补充响应说明。",
        sourceDocumentId: input.bidDocumentId,
        metadata: {
          requirementCategory: requirement.category,
          keyword,
          checker: "requirement-keyword"
        }
      });
    }

    for (const keyword of scheduleKeywords) {
      if (!input.tenderMarkdown.includes(keyword) || input.bidMarkdown.includes(keyword)) continue;
      findings.push({
        category: "logic_consistency",
        severity: "medium",
        title: `${keyword} 未见响应`,
        summary: `招标文件出现“${keyword}”，投标文件正文未检索到对应承诺。`,
        evidence: excerptAround(input.tenderMarkdown, keyword) || `招标文件包含 ${keyword}`,
        suggestion: "请在技术或商务响应章节补充对应期限承诺，避免被认定为未响应。",
        sourceDocumentId: input.bidDocumentId,
        metadata: { keyword, checker: "schedule-keyword" }
      });
    }

    for (const [wrongText, correctText] of commonTypoPairs) {
      const evidence = excerptAround(input.bidMarkdown, wrongText);
      if (!evidence) continue;
      findings.push({
        category: "typo",
        severity: "low",
        title: `疑似错别字：${wrongText}`,
        summary: `投标文件中出现“${wrongText}”，建议核对是否应为“${correctText}”。`,
        evidence,
        suggestion: `如确认为录入错误，请改为“${correctText}”。`,
        sourceDocumentId: input.bidDocumentId,
        metadata: { wrongText, correctText, checker: "typo-dictionary" }
      });
    }

    return findings.slice(0, 120);
  }
}
