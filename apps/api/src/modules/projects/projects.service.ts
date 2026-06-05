import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

interface CreateProjectInput {
  name: string;
  ownerName?: string;
  tenderName?: string;
}

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      take: 50
    });
  }

  get(id: string) {
    return this.prisma.project.findUnique({
      where: { id },
      include: {
        documents: true,
        tasks: {
          orderBy: { createdAt: "desc" }
        }
      }
    });
  }

  create(input: CreateProjectInput) {
    return this.prisma.project.create({
      data: {
        name: input.name,
        ownerName: input.ownerName,
        tenderName: input.tenderName
      }
    });
  }
}
