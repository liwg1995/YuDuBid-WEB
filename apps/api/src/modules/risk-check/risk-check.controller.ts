import { BadRequestException, Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { z } from "zod";
import { RiskCheckService } from "./risk-check.service";

const riskCheckSchema = z.object({
  projectId: z.string(),
  tenderDocumentId: z.string().optional(),
  bidDocumentId: z.string().optional()
});
const riskCheckRunNowSchema = riskCheckSchema.extend({ taskId: z.string().optional() });

function parseBody<T>(schema: z.ZodType<T>, body: unknown) {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new BadRequestException(parsed.error.issues.map((issue) => issue.message).join("；"));
  }
  return parsed.data;
}

@Controller("risk-check")
export class RiskCheckController {
  constructor(private readonly riskCheckService: RiskCheckService) {}

  @Get()
  list(@Query("projectId") projectId?: string) {
    return this.riskCheckService.list(projectId);
  }

  @Get(":id")
  getRun(@Param("id") id: string) {
    return this.riskCheckService.getRun(id);
  }

  @Post("run")
  run(@Body() body: unknown) {
    return this.riskCheckService.enqueue(parseBody(riskCheckSchema, body));
  }

  @Post("run-now")
  runNow(@Body() body: unknown) {
    return this.riskCheckService.runNow(parseBody(riskCheckRunNowSchema, body));
  }
}
