import { Injectable } from "@nestjs/common";
import { TasksService } from "../tasks/tasks.service";

interface DuplicateCheckInput {
  projectId?: string;
  tenderDocumentId?: string;
  bidDocumentIds: string[];
}

@Injectable()
export class DuplicateCheckService {
  constructor(private readonly tasksService: TasksService) {}

  enqueue(input: DuplicateCheckInput) {
    return this.tasksService.enqueue({
      projectId: input.projectId,
      type: "duplicate_check",
      payload: { ...input }
    });
  }
}
