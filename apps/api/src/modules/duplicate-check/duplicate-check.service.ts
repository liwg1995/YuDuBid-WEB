import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { TasksService } from "../tasks/tasks.service";

interface DuplicateCheckInput {
  projectId?: string;
  tenderDocumentId?: string;
  bidDocumentIds: string[];
  taskId?: string;
}

interface LoadedDocument {
  id: string;
  fileName: string;
  metadata: Prisma.JsonValue;
  markdown: string;
}

interface FindingDraft {
  category: string;
  severity: "high" | "medium" | "low";
  title: string;
  summary: string;
  evidence?: string;
  suggestion: string;
  sourceDocumentId?: string;
  metadata?: Prisma.InputJsonObject;
}

const imagePattern = /!\[[^\]]*]\(([^)]+)\)|<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeSentence(value: string) {
  return normalizeText(value)
    .replace(/[^\p{Script=Han}a-zA-Z0-9]+/gu, "")
    .toLowerCase();
}

function splitSentences(markdown: string) {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .split(/[。！？!?；;\n\r]+/)
    .map(normalizeText)
    .filter((item) => item.length >= 18 && item.length <= 220);
}

function headings(markdown: string, metadata: Prisma.JsonValue) {
  const fromMetadata = (metadata as { stats?: { headings?: string[] } } | null)?.stats?.headings;
  if (Array.isArray(fromMetadata) && fromMetadata.length) return fromMetadata.map(String).map(normalizeText).filter(Boolean);
  return markdown
    .split(/\r?\n/)
    .map((line) => line.match(/^#{1,6}\s+(.+)$/)?.[1] || line.match(/^[一二三四五六七八九十\d]+[、.．]\s*(.+)$/)?.[1] || "")
    .map(normalizeText)
    .filter(Boolean)
    .slice(0, 300);
}

function jaccard(left: string[], right: string[]) {
  const leftSet = new Set(left.map(normalizeSentence).filter(Boolean));
  const rightSet = new Set(right.map(normalizeSentence).filter(Boolean));
  if (!leftSet.size || !rightSet.size) return 0;
  const intersection = [...leftSet].filter((item) => rightSet.has(item)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return union ? intersection / union : 0;
}

function collectImageRefs(markdown: string) {
  const refs: string[] = [];
  for (const match of markdown.matchAll(imagePattern)) {
    refs.push(normalizeText(match[1] || match[2] || ""));
  }
  return refs.filter(Boolean);
}

function fileMetadata(metadata: Prisma.JsonValue) {
  const value = (metadata || {}) as Record<string, unknown>;
  return {
    size: value.size,
    parser: value.parser,
    providerId: value.providerId,
    bucket: value.bucket,
    endpoint: value.endpoint
  };
}

function pairKey(left: LoadedDocument, right: LoadedDocument) {
  return `${left.fileName} ↔ ${right.fileName}`;
}

@Injectable()
export class DuplicateCheckService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly tasksService: TasksService
  ) {}

  enqueue(input: DuplicateCheckInput) {
    return this.tasksService.enqueue({
      projectId: input.projectId,
      type: "duplicate_check",
      payload: { ...input }
    });
  }

  list(projectId?: string) {
    return this.prisma.checkRun.findMany({
      where: {
        projectId,
        type: "duplicate_check"
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

  async runNow(input: DuplicateCheckInput) {
    const uniqueBidIds = [...new Set(input.bidDocumentIds)].filter(Boolean);
    if (uniqueBidIds.length < 2) {
      throw new NotFoundException("标书查重至少需要选择两份投标文件。");
    }

    const documents = await Promise.all(uniqueBidIds.map((id) => this.loadDocument(id)));
    const tenderDocument = input.tenderDocumentId ? await this.loadDocument(input.tenderDocumentId) : null;
    const findings = this.createFindings(documents, tenderDocument);
    const severityCounts = findings.reduce<Record<string, number>>((acc, item) => {
      acc[item.severity] = (acc[item.severity] || 0) + 1;
      return acc;
    }, {});

    const run = await this.prisma.$transaction(async (tx) => {
      const created = await tx.checkRun.create({
        data: {
          projectId: input.projectId,
          taskId: input.taskId,
          type: "duplicate_check",
          status: "ready",
          title: "标书查重分析",
          summary: `分析 ${documents.length} 份投标文件，发现 ${findings.length} 个相似项。`,
          input: {
            tenderDocumentId: input.tenderDocumentId || null,
            bidDocumentIds: uniqueBidIds
          },
          result: {
            checker: "rule-v1",
            documentCount: documents.length,
            severityCounts,
            tenderDocumentId: tenderDocument?.id || null
          }
        }
      });

      if (findings.length) {
        await tx.checkFinding.createMany({
          data: findings.map((item, index) => ({
            runId: created.id,
            projectId: input.projectId,
            type: "duplicate_check",
            category: item.category,
            severity: item.severity,
            title: item.title,
            summary: item.summary,
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
      message: "标书查重完成。"
    };
  }

  private async loadDocument(id: string): Promise<LoadedDocument> {
    const document = await this.prisma.document.findUnique({ where: { id } });
    if (!document) throw new NotFoundException(`文档 ${id} 不存在。`);
    const metadata = document.metadata || {};
    const markdown = document.markdownKey
      ? await this.storageService.readObjectText(document.markdownKey)
      : String((metadata as { markdownPreview?: string }).markdownPreview || "");
    return {
      id: document.id,
      fileName: document.fileName,
      metadata,
      markdown
    };
  }

  private createFindings(documents: LoadedDocument[], tenderDocument: LoadedDocument | null) {
    const findings: FindingDraft[] = [];

    for (let i = 0; i < documents.length; i += 1) {
      for (let j = i + 1; j < documents.length; j += 1) {
        const left = documents[i];
        const right = documents[j];
        findings.push(...this.compareDocumentPair(left, right));
      }
    }

    if (tenderDocument) {
      for (const bidDocument of documents) {
        const similarity = jaccard(headings(tenderDocument.markdown, tenderDocument.metadata), headings(bidDocument.markdown, bidDocument.metadata));
        if (similarity >= 0.75) {
          findings.push({
            category: "outline",
            severity: "low",
            title: "目录结构高度贴合招标文件",
            summary: `${bidDocument.fileName} 与招标文件目录相似度 ${(similarity * 100).toFixed(1)}%。`,
            evidence: "投标文件目录与招标文件要求高度一致，通常是正常响应，但可用于复核是否照搬招标文件表述。",
            suggestion: "如正文也大量复制招标要求，请适当改写为投标方响应口径。",
            sourceDocumentId: bidDocument.id,
            metadata: {
              tenderDocumentId: tenderDocument.id,
              bidDocumentId: bidDocument.id,
              similarity
            }
          });
        }
      }
    }

    return findings.slice(0, 200);
  }

  private compareDocumentPair(left: LoadedDocument, right: LoadedDocument) {
    const findings: FindingDraft[] = [];
    const title = pairKey(left, right);
    const headingSimilarity = jaccard(headings(left.markdown, left.metadata), headings(right.markdown, right.metadata));

    if (headingSimilarity >= 0.65) {
      findings.push({
        category: "outline",
        severity: headingSimilarity >= 0.85 ? "high" : "medium",
        title: "目录结构相似",
        summary: `${title} 的目录相似度 ${(headingSimilarity * 100).toFixed(1)}%。`,
        evidence: "两份文件的章节标题集合存在较高重合。",
        suggestion: "请检查章节顺序、标题表述和正文是否存在模板化重复。",
        sourceDocumentId: left.id,
        metadata: { leftDocumentId: left.id, rightDocumentId: right.id, similarity: headingSimilarity }
      });
    }

    const leftSentences = splitSentences(left.markdown);
    const rightSet = new Map(splitSentences(right.markdown).map((sentence) => [normalizeSentence(sentence), sentence]));
    const repeated = leftSentences
      .map((sentence) => ({ normalized: normalizeSentence(sentence), sentence }))
      .filter((item) => item.normalized.length >= 18 && rightSet.has(item.normalized))
      .slice(0, 12);

    if (repeated.length) {
      findings.push({
        category: "content",
        severity: repeated.length >= 8 ? "high" : "medium",
        title: "正文存在重复句段",
        summary: `${title} 检出 ${repeated.length} 条完全重复句段。`,
        evidence: repeated.map((item) => item.sentence).join("\n"),
        suggestion: "请重点复核重复句段所在章节，必要时改写为项目专属表达。",
        sourceDocumentId: left.id,
        metadata: {
          leftDocumentId: left.id,
          rightDocumentId: right.id,
          repeatedCount: repeated.length
        }
      });
    }

    const leftImages = new Set(collectImageRefs(left.markdown));
    const repeatedImages = collectImageRefs(right.markdown).filter((image) => leftImages.has(image));
    if (repeatedImages.length) {
      findings.push({
        category: "image",
        severity: "medium",
        title: "图片引用重复",
        summary: `${title} 存在 ${repeatedImages.length} 个重复图片引用。`,
        evidence: repeatedImages.slice(0, 8).join("\n"),
        suggestion: "请确认图片是否为同一模板或同一素材，必要时替换为项目专属图片。",
        sourceDocumentId: left.id,
        metadata: {
          leftDocumentId: left.id,
          rightDocumentId: right.id,
          repeatedImages: repeatedImages.slice(0, 20)
        }
      });
    }

    const leftMeta = fileMetadata(left.metadata);
    const rightMeta = fileMetadata(right.metadata);
    const sameMetaKeys = Object.keys(leftMeta).filter((key) => {
      const leftValue = leftMeta[key as keyof typeof leftMeta];
      const rightValue = rightMeta[key as keyof typeof rightMeta];
      return leftValue !== undefined && leftValue !== "" && leftValue === rightValue;
    });
    if (sameMetaKeys.length >= 3) {
      findings.push({
        category: "metadata",
        severity: "low",
        title: "文件元数据相似",
        summary: `${title} 有 ${sameMetaKeys.length} 项基础元数据一致。`,
        evidence: sameMetaKeys.join("、"),
        suggestion: "基础元数据相似不直接代表重复，请结合目录、正文和图片结果综合判断。",
        sourceDocumentId: left.id,
        metadata: {
          leftDocumentId: left.id,
          rightDocumentId: right.id,
          sameMetaKeys
        }
      });
    }

    return findings;
  }
}
