import { Body, Controller, Get, HttpCode, Post, Query } from "@nestjs/common";
import { z } from "zod";
import { TenderAnalysisService } from "./tender-analysis.service";

const extractSchema = z.object({
  projectId: z.string().optional(),
  documentId: z.string()
});

@Controller("tender-analysis")
export class TenderAnalysisController {
  constructor(private readonly tenderAnalysisService: TenderAnalysisService) {}

  @Get()
  list(@Query("projectId") projectId?: string) {
    return this.tenderAnalysisService.list(projectId);
  }

  @Get("requirements")
  listRequirements(@Query("projectId") projectId?: string, @Query("category") category?: string) {
    return this.tenderAnalysisService.listRequirements({ projectId, category });
  }

  @Post("extract")
  @HttpCode(200)
  extract(@Body() body: unknown) {
    return this.tenderAnalysisService.extractFromDocument(extractSchema.parse(body));
  }
}
