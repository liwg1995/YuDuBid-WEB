import { InjectQueue } from "@nestjs/bullmq";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Queue } from "bullmq";
import { PrismaService } from "../prisma/prisma.service";

interface CreateTaskInput {
  projectId?: string;
  type: "tender_parse" | "outline_generate" | "content_generate" | "risk_check" | "duplicate_check";
  payload?: Record<string, unknown>;
}

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue("bidkit-tasks") private readonly taskQueue: Queue
  ) {}

  list() {
    return this.prisma.aiTask.findMany({
      orderBy: { createdAt: "desc" },
      take: 100
    });
  }

  async enqueue(input: CreateTaskInput) {
    const payload = (input.payload ?? {}) as Prisma.InputJsonObject;
    const task = await this.prisma.aiTask.create({
      data: {
        projectId: input.projectId,
        type: input.type,
        status: "queued",
        payload
      }
    });

    await this.taskQueue.add(input.type, {
      taskId: task.id,
      projectId: input.projectId,
      payload
    });

    return task;
  }
}
