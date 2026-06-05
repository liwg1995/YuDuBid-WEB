import { Body, Controller, Post } from "@nestjs/common";
import { z } from "zod";
import { DuplicateCheckService } from "./duplicate-check.service";

const duplicateCheckSchema = z.object({
  projectId: z.string().optional(),
  tenderDocumentId: z.string().optional(),
  bidDocumentIds: z.array(z.string()).min(2)
});

@Controller("duplicate-check")
export class DuplicateCheckController {
  constructor(private readonly duplicateCheckService: DuplicateCheckService) {}

  @Post("run")
  run(@Body() body: unknown) {
    return this.duplicateCheckService.enqueue(duplicateCheckSchema.parse(body));
  }
}
