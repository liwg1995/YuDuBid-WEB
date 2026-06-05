import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";

interface ExtractInput {
  projectId?: string;
  documentId: string;
}

interface ListRequirementsInput {
  projectId?: string;
  category?: string;
}

interface ExtractedRequirement {
  category: string;
  title: string;
  content: string;
  source?: string;
  severity?: string;
}

const categoryKeywords: Array<{ category: string; keywords: string[]; severity?: string }> = [
  { category: "project_overview", keywords: ["项目概况", "项目名称", "建设内容", "采购内容", "服务范围"] },
  { category: "qualification", keywords: ["资格", "资质", "投标人", "项目经理", "人员要求"] },
  { category: "scoring", keywords: ["评分", "评审", "分值", "评分办法", "评标办法"] },
  { category: "technical", keywords: ["技术", "参数", "实施方案", "服务要求", "功能要求"] },
  { category: "business", keywords: ["商务", "付款", "报价", "合同", "履约保证金", "服务期"] },
  { category: "rejection", keywords: ["废标", "无效标", "否决", "重大偏离", "实质性响应"], severity: "high" },
  { category: "materials", keywords: ["提交材料", "投标文件组成", "证明材料", "附件", "清单"] },
  { category: "schedule", keywords: ["工期", "交付", "截止", "开标", "质保", "服务期限"] }
];

function normalizeLine(line: string) {
  return line.replace(/\s+/g, " ").trim();
}

function headingTitle(line: string) {
  return line.replace(/^#+\s*/, "").replace(/^[一二三四五六七八九十\d]+[、.．]\s*/, "").trim();
}

function classify(text: string) {
  const normalized = text.toLowerCase();
  return categoryKeywords.find((item) => item.keywords.some((keyword) => normalized.includes(keyword.toLowerCase())));
}

function splitSections(markdown: string) {
  const sections: Array<{ title: string; content: string }> = [];
  let current = { title: "全文摘要", content: "" };

  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = normalizeLine(rawLine);
    if (!line) continue;
    if (/^#{1,6}\s+/.test(line) || /^[一二三四五六七八九十\d]+[、.．]\s*\S+/.test(line)) {
      if (current.content.trim()) sections.push(current);
      current = { title: headingTitle(line), content: "" };
    } else {
      current.content += `${line}\n`;
    }
  }

  if (current.content.trim()) sections.push(current);
  return sections.slice(0, 120);
}

function extractRequirements(markdown: string) {
  const sections = splitSections(markdown);
  const requirements: ExtractedRequirement[] = [];

  sections.forEach((section) => {
    const classifier = classify(`${section.title}\n${section.content}`);
    if (!classifier) return;
    requirements.push({
      category: classifier.category,
      title: section.title,
      content: section.content.trim().slice(0, 4000),
      source: section.title,
      severity: classifier.severity
    });
  });

  const lines = markdown
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter((line) => line.length >= 8 && line.length <= 500);

  lines.forEach((line) => {
    const classifier = classify(line);
    if (!classifier) return;
    if (requirements.some((item) => item.content.includes(line) || line.includes(item.title))) return;
    requirements.push({
      category: classifier.category,
      title: line.slice(0, 80),
      content: line,
      source: "line",
      severity: classifier.severity
    });
  });

  return requirements.slice(0, 200);
}

function summaryFor(markdown: string) {
  return markdown
    .split(/\r?\n/)
    .map(normalizeLine)
    .filter(Boolean)
    .slice(0, 8)
    .join("\n")
    .slice(0, 1000);
}

@Injectable()
export class TenderAnalysisService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService
  ) {}

  list(projectId?: string) {
    return this.prisma.tenderAnalysis.findMany({
      where: projectId ? { projectId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        requirements: {
          orderBy: { sortOrder: "asc" }
        }
      }
    });
  }

  listRequirements(input: ListRequirementsInput) {
    return this.prisma.tenderRequirement.findMany({
      where: {
        projectId: input.projectId,
        category: input.category
      },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }]
    });
  }

  async extractFromDocument(input: ExtractInput) {
    const document = await this.prisma.document.findUnique({
      where: { id: input.documentId }
    });
    if (!document) throw new NotFoundException("文档不存在。");
    if (!document.projectId && !input.projectId) throw new NotFoundException("文档未关联项目。");

    const projectId = input.projectId || document.projectId!;
    const markdown = document.markdownKey
      ? await this.storageService.readObjectText(document.markdownKey)
      : String((document.metadata as { markdownPreview?: string } | null)?.markdownPreview || "");

    if (!markdown.trim()) {
      throw new NotFoundException("文档 Markdown 中间态为空，请先完成文档解析。");
    }

    const sections = splitSections(markdown);
    const extracted = extractRequirements(markdown);

    await this.prisma.tenderRequirement.deleteMany({
      where: {
        projectId,
        documentId: document.id
      }
    });
    await this.prisma.tenderAnalysis.deleteMany({
      where: {
        projectId,
        documentId: document.id
      }
    });

    const analysis = await this.prisma.tenderAnalysis.create({
      data: {
        projectId,
        documentId: document.id,
        title: `${document.fileName} 结构化分析`,
        summary: summaryFor(markdown),
        sections: sections.slice(0, 40) as unknown as Prisma.InputJsonValue,
        status: "ready",
        requirements: {
          create: extracted.map((item, index) => ({
            projectId,
            documentId: document.id,
            category: item.category,
            title: item.title,
            content: item.content,
            source: item.source,
            severity: item.severity,
            sortOrder: index,
            metadata: {
              extractor: "rule-v1"
            }
          }))
        }
      },
      include: {
        requirements: {
          orderBy: { sortOrder: "asc" }
        }
      }
    });

    return {
      analysis,
      requirementCount: analysis.requirements.length,
      message: "招标文件结构化提取完成。"
    };
  }
}
