import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { z } from "zod";
import { ProjectsService } from "./projects.service";

const createProjectSchema = z.object({
  name: z.string().min(1),
  ownerName: z.string().optional(),
  tenderName: z.string().optional()
});

@Controller("projects")
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  listProjects() {
    return this.projectsService.list();
  }

  @Get(":id")
  getProject(@Param("id") id: string) {
    return this.projectsService.get(id);
  }

  @Post()
  createProject(@Body() body: unknown) {
    const input = createProjectSchema.parse(body);
    return this.projectsService.create(input);
  }
}
