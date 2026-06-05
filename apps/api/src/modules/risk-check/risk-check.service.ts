import { Injectable } from "@nestjs/common";
import { TasksService } from "../tasks/tasks.service";

interface RiskCheckInput {
  projectId: string;
  tenderDocumentId?: string;
  bidDocumentId?: string;
}

@Injectable()
export class RiskCheckService {
  constructor(private readonly tasksService: TasksService) {}

  enqueue(input: RiskCheckInput) {
    return this.tasksService.enqueue({
      projectId: input.projectId,
      type: "risk_check",
      payload: { ...input }
    });
  }
}
