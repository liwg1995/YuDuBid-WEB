import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";

interface ListItemsInput {
  q?: string;
  tag?: string;
}

interface CreateDocumentInput {
  title: string;
  fileName?: string;
  storageKey?: string;
  status: string;
}

interface CreateItemInput {
  documentId: string;
  title: string;
  summary?: string;
  content: string;
  tags: string[];
}

interface ImportFromDocumentInput {
  documentId: string;
  title?: string;
  summary?: string;
  tags: string[];
  category?: string;
}

interface UpdateItemInput {
  title?: string;
  summary?: string;
  content?: string;
  tags?: string[];
}

@Injectable()
export class KnowledgeBaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService
  ) {}

  async getSummary() {
    const [documents, items] = await Promise.all([
      this.prisma.knowledgeDocument.count(),
      this.prisma.knowledgeItem.count()
    ]);

    return {
      documents,
      items,
      status: "ready"
    };
  }

  listDocuments() {
    return this.prisma.knowledgeDocument.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        items: {
          orderBy: { updatedAt: "desc" },
          take: 5
        }
      }
    });
  }

  createDocument(input: CreateDocumentInput) {
    return this.prisma.knowledgeDocument.create({ data: input });
  }

  listItems(input: ListItemsInput) {
    return this.prisma.knowledgeItem.findMany({
      where: {
        tags: input.tag ? { has: input.tag } : undefined,
        OR: input.q
          ? [
              { title: { contains: input.q, mode: "insensitive" } },
              { summary: { contains: input.q, mode: "insensitive" } },
              { content: { contains: input.q, mode: "insensitive" } }
            ]
          : undefined
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: {
        document: true
      }
    });
  }

  createItem(input: CreateItemInput) {
    return this.prisma.knowledgeItem.create({ data: input });
  }

  updateItem(id: string, input: UpdateItemInput) {
    return this.prisma.knowledgeItem.update({
      where: { id },
      data: input
    });
  }

  deleteItem(id: string) {
    return this.prisma.knowledgeItem.delete({ where: { id } });
  }

  async importFromDocument(input: ImportFromDocumentInput) {
    const document = await this.prisma.document.findUnique({
      where: { id: input.documentId }
    });
    if (!document) throw new Error("文档不存在。");

    const markdown = document.markdownKey
      ? await this.storageService.readObjectText(document.markdownKey)
      : String((document.metadata as { markdownPreview?: string } | null)?.markdownPreview || "");

    const title = input.title || document.fileName.replace(/\.[^.]+$/, "");
    const summary = input.summary || markdown.split(/\r?\n/).filter(Boolean).slice(0, 4).join("\n").slice(0, 500);
    const tags = Array.from(new Set([...(input.tags || []), input.category || "候选素材"].filter(Boolean)));

    const knowledgeDocument = await this.prisma.knowledgeDocument.create({
      data: {
        title,
        fileName: document.fileName,
        storageKey: document.markdownKey || document.storageKey,
        status: "ready",
        items: {
          create: {
            title,
            summary,
            content: markdown.slice(0, 12000),
            tags
          }
        }
      },
      include: {
        items: true
      }
    });

    return {
      document: knowledgeDocument,
      item: knowledgeDocument.items[0],
      message: "知识素材已正式入库。"
    };
  }
}
