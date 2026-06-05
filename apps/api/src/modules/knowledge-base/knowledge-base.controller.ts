import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query } from "@nestjs/common";
import { z } from "zod";
import { KnowledgeBaseService } from "./knowledge-base.service";

const createDocumentSchema = z.object({
  title: z.string().min(1),
  fileName: z.string().optional(),
  storageKey: z.string().optional(),
  status: z.string().default("ready")
});

const createItemSchema = z.object({
  documentId: z.string(),
  title: z.string().min(1),
  summary: z.string().optional(),
  content: z.string().min(1),
  tags: z.array(z.string()).default([])
});

const importFromDocumentSchema = z.object({
  documentId: z.string(),
  title: z.string().optional(),
  summary: z.string().optional(),
  tags: z.array(z.string()).default([]),
  category: z.string().optional()
});

const updateItemSchema = z.object({
  title: z.string().min(1).optional(),
  summary: z.string().optional(),
  content: z.string().min(1).optional(),
  tags: z.array(z.string()).optional()
});

@Controller("knowledge-base")
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Get("summary")
  getSummary() {
    return this.knowledgeBaseService.getSummary();
  }

  @Get("documents")
  listDocuments() {
    return this.knowledgeBaseService.listDocuments();
  }

  @Post("documents")
  createDocument(@Body() body: unknown) {
    return this.knowledgeBaseService.createDocument(createDocumentSchema.parse(body));
  }

  @Get("items")
  listItems(@Query("q") q?: string, @Query("tag") tag?: string) {
    return this.knowledgeBaseService.listItems({ q, tag });
  }

  @Post("items")
  createItem(@Body() body: unknown) {
    return this.knowledgeBaseService.createItem(createItemSchema.parse(body));
  }

  @Post("import-document")
  @HttpCode(200)
  importDocument(@Body() body: unknown) {
    return this.knowledgeBaseService.importFromDocument(importFromDocumentSchema.parse(body));
  }

  @Put("items/:id")
  @HttpCode(200)
  updateItem(@Param("id") id: string, @Body() body: unknown) {
    return this.knowledgeBaseService.updateItem(id, updateItemSchema.parse(body));
  }

  @Delete("items/:id")
  deleteItem(@Param("id") id: string) {
    return this.knowledgeBaseService.deleteItem(id);
  }
}
