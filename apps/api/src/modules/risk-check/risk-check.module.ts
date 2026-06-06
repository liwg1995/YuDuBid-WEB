import { Module } from "@nestjs/common";
import { StorageModule } from "../storage/storage.module";
import { TasksModule } from "../tasks/tasks.module";
import { RiskCheckController } from "./risk-check.controller";
import { RiskCheckService } from "./risk-check.service";

@Module({
  imports: [StorageModule, TasksModule],
  controllers: [RiskCheckController],
  providers: [RiskCheckService],
  exports: [RiskCheckService]
})
export class RiskCheckModule {}
