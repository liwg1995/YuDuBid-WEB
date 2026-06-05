import { Body, Controller, Post } from "@nestjs/common";
import { z } from "zod";
import { RiskCheckService } from "./risk-check.service";

const riskCheckSchema = z.object({
  projectId: z.string(),
  tenderDocumentId: z.string().optional(),
  bidDocumentId: z.string().optional()
});

@Controller("risk-check")
export class RiskCheckController {
  constructor(private readonly riskCheckService: RiskCheckService) {}

  @Post("run")
  run(@Body() body: unknown) {
    return this.riskCheckService.enqueue(riskCheckSchema.parse(body));
  }
}
