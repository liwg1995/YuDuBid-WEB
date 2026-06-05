import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UploadedFile,
  UseInterceptors
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { z } from "zod";
import { DocumentsService } from "./documents.service";

const parseDocumentSchema = z.object({
  projectId: z.string().optional(),
  documentId: z.string().optional(),
  storageKey: z.string().optional(),
  parser: z.enum(["auto", "docx", "pdf", "mineru"]).optional()
});

const uploadDocumentSchema = z.object({
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  role: z.string().default("tender"),
  parser: z.enum(["auto", "docx", "pdf", "mineru"]).default("auto")
});

@Controller("documents")
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  listDocuments(@Query("projectId") projectId?: string) {
    return this.documentsService.list(projectId);
  }

  @Get(":id/markdown")
  getMarkdown(@Param("id") id: string) {
    return this.documentsService.getMarkdown(id);
  }

  @Post("upload")
  @HttpCode(200)
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 100 * 1024 * 1024 } }))
  uploadDocument(@UploadedFile() file: Express.Multer.File, @Body() body: unknown) {
    if (!file) {
      throw new BadRequestException("请上传 file 字段。");
    }
    return this.documentsService.upload({
      ...uploadDocumentSchema.parse(body),
      file
    });
  }

  @Post("parse")
  parseDocument(@Body() body: unknown) {
    return this.documentsService.requestParse(parseDocumentSchema.parse(body));
  }
}
