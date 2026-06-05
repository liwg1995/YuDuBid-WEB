import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { StorageModule } from "../storage/storage.module";
import { TenderAnalysisController } from "./tender-analysis.controller";
import { TenderAnalysisService } from "./tender-analysis.service";

@Module({
  imports: [PrismaModule, StorageModule],
  controllers: [TenderAnalysisController],
  providers: [TenderAnalysisService],
  exports: [TenderAnalysisService]
})
export class TenderAnalysisModule {}
