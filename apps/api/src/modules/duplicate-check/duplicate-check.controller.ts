import { BadRequestException, Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { z } from "zod";
import { DuplicateCheckService } from "./duplicate-check.service";

const duplicateCheckSchema = z.object({
  projectId: z.string().optional(),
  tenderDocumentId: z.string().optional(),
  bidDocumentIds: z.array(z.string()).min(2)
});
const duplicateCheckRunNowSchema = duplicateCheckSchema.extend({ taskId: z.string().optional() });

function parseBody<T>(schema: z.ZodType<T>, body: unknown) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new BadRequestException(parsed.error.issues.map((issue) => issue.message).join("；"));
  }
  return parsed.data;
}

@Controller("duplicate-check")
export class DuplicateCheckController {
  constructor(private readonly duplicateCheckService: DuplicateCheckService) {}

  @Get()
  list(@Query("projectId") projectId?: string) {
    return this.duplicateCheckService.list(projectId);
  }

  @Get(":id")
  getRun(@Param("id") id: string) {
    return this.duplicateCheckService.getRun(id);
  }

  @Post("run")
  run(@Body() body: unknown) {
    return this.duplicateCheckService.enqueue(parseBody(duplicateCheckSchema, body));
  }

  @Post("run-now")
  runNow(@Body() body: unknown) {
    return this.duplicateCheckService.runNow(parseBody(duplicateCheckRunNowSchema, body));
  }
}
