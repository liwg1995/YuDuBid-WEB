import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AiModule } from "./modules/ai/ai.module";
import { DocumentsModule } from "./modules/documents/documents.module";
import { DuplicateCheckModule } from "./modules/duplicate-check/duplicate-check.module";
import { HealthModule } from "./modules/health/health.module";
import { KnowledgeBaseModule } from "./modules/knowledge-base/knowledge-base.module";
import { OutlinesModule } from "./modules/outlines/outlines.module";
import { PrismaModule } from "./modules/prisma/prisma.module";
import { ProjectsModule } from "./modules/projects/projects.module";
import { RiskCheckModule } from "./modules/risk-check/risk-check.module";
import { StorageModule } from "./modules/storage/storage.module";
import { SystemConfigModule } from "./modules/system-config/system-config.module";
import { TenderAnalysisModule } from "./modules/tender-analysis/tender-analysis.module";
import { TasksModule } from "./modules/tasks/tasks.module";

function redisConnectionFromUrl(value: string) {
  const url = new URL(value);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: redisConnectionFromUrl(config.get<string>("REDIS_URL", "redis://localhost:6379"))
      })
    }),
    PrismaModule,
    HealthModule,
    ProjectsModule,
    TasksModule,
    AiModule,
    DocumentsModule,
    KnowledgeBaseModule,
    TenderAnalysisModule,
    OutlinesModule,
    RiskCheckModule,
    DuplicateCheckModule,
    SystemConfigModule,
    StorageModule
  ]
})
export class AppModule {}
