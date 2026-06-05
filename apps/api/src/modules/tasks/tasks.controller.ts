import { Body, Controller, Get, Post } from "@nestjs/common";
import { z } from "zod";
import { TasksService } from "./tasks.service";

const createTaskSchema = z.object({
  projectId: z.string().optional(),
  type: z.enum(["tender_parse", "outline_generate", "content_generate", "risk_check", "duplicate_check"]),
  payload: z.record(z.unknown()).optional()
});

@Controller("tasks")
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  listTasks() {
    return this.tasksService.list();
  }

  @Post()
  createTask(@Body() body: unknown) {
    return this.tasksService.enqueue(createTaskSchema.parse(body));
  }
}
