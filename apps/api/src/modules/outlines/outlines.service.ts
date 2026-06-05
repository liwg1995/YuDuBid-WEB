import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

interface CreateOutlineInput {
  projectId: string;
  parentId?: string;
  title: string;
  description?: string;
  content?: string;
  level: number;
  sortOrder: number;
}

interface UpdateOutlineInput {
  parentId?: string | null;
  title?: string;
  description?: string;
  content?: string;
  level?: number;
  sortOrder?: number;
}

interface GenerateInput {
  projectId: string;
  reset: boolean;
}

const fallbackOutline = [
  "项目理解与需求分析",
  "总体技术方案",
  "系统架构与功能设计",
  "实施组织与进度计划",
  "质量、安全与风险控制",
  "运维服务与售后保障",
  "项目团队与类似业绩"
];

@Injectable()
export class OutlinesService {
  constructor(private readonly prisma: PrismaService) {}

  list(projectId: string) {
    return this.prisma.outlineNode.findMany({
      where: { projectId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    });
  }

  create(input: CreateOutlineInput) {
    return this.prisma.outlineNode.create({ data: input });
  }

  update(id: string, input: UpdateOutlineInput) {
    return this.prisma.outlineNode.update({
      where: { id },
      data: input
    });
  }

  delete(id: string) {
    return this.prisma.outlineNode.delete({ where: { id } });
  }

  async reorder(items: Array<{ id: string; sortOrder: number; parentId?: string | null }>) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.outlineNode.update({
          where: { id: item.id },
          data: {
            sortOrder: item.sortOrder,
            parentId: item.parentId
          }
        })
      )
    );
    return { status: "ok", count: items.length };
  }

  async generate(input: GenerateInput) {
    if (input.reset) {
      await this.prisma.outlineNode.deleteMany({ where: { projectId: input.projectId } });
    }

    const existing = await this.prisma.outlineNode.count({ where: { projectId: input.projectId } });
    if (existing && !input.reset) {
      return {
        status: "exists",
        outlines: await this.list(input.projectId),
        message: "项目已存在大纲，未重复生成。"
      };
    }

    const requirements = await this.prisma.tenderRequirement.findMany({
      where: { projectId: input.projectId },
      orderBy: { sortOrder: "asc" },
      take: 60
    });

    const titles = requirements
      .filter((item) => ["project_overview", "technical", "schedule", "qualification", "business", "materials"].includes(item.category))
      .map((item) => item.title)
      .filter(Boolean);

    const outlineTitles = Array.from(new Set([...(titles.length ? titles.slice(0, 8) : fallbackOutline), ...fallbackOutline])).slice(0, 10);

    await this.prisma.outlineNode.createMany({
      data: outlineTitles.map((title, index) => ({
        projectId: input.projectId,
        title,
        description: requirements.find((item) => item.title === title)?.content.slice(0, 300),
        content: `## ${title}\n\n请结合招标要求、企业知识库和项目实施能力完善本章节内容。`,
        sortOrder: index,
        level: 1
      }))
    });

    return {
      status: "generated",
      outlines: await this.list(input.projectId),
      message: "技术标大纲已生成。"
    };
  }
}
