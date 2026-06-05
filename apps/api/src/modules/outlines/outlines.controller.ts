import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query } from "@nestjs/common";
import { z } from "zod";
import { OutlinesService } from "./outlines.service";

const createSchema = z.object({
  projectId: z.string(),
  parentId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  content: z.string().optional(),
  level: z.number().int().min(1).default(1),
  sortOrder: z.number().int().default(0)
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  content: z.string().optional(),
  parentId: z.string().nullable().optional(),
  level: z.number().int().min(1).optional(),
  sortOrder: z.number().int().optional()
});

const generateSchema = z.object({
  projectId: z.string(),
  reset: z.boolean().default(false)
});

const reorderSchema = z.object({
  items: z.array(z.object({ id: z.string(), sortOrder: z.number().int(), parentId: z.string().nullable().optional() }))
});

@Controller("outlines")
export class OutlinesController {
  constructor(private readonly outlinesService: OutlinesService) {}

  @Get()
  list(@Query("projectId") projectId: string) {
    return this.outlinesService.list(projectId);
  }

  @Post()
  create(@Body() body: unknown) {
    return this.outlinesService.create(createSchema.parse(body));
  }

  @Post("generate")
  @HttpCode(200)
  generate(@Body() body: unknown) {
    return this.outlinesService.generate(generateSchema.parse(body));
  }

  @Put(":id")
  @HttpCode(200)
  update(@Param("id") id: string, @Body() body: unknown) {
    return this.outlinesService.update(id, updateSchema.parse(body));
  }

  @Patch("reorder")
  @HttpCode(200)
  reorder(@Body() body: unknown) {
    return this.outlinesService.reorder(reorderSchema.parse(body).items);
  }

  @Delete(":id")
  delete(@Param("id") id: string) {
    return this.outlinesService.delete(id);
  }
}
