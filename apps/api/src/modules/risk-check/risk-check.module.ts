import { Module } from "@nestjs/common";
import { TasksModule } from "../tasks/tasks.module";
import { RiskCheckController } from "./risk-check.controller";
import { RiskCheckService } from "./risk-check.service";

@Module({
  imports: [TasksModule],
  controllers: [RiskCheckController],
  providers: [RiskCheckService],
  exports: [RiskCheckService]
})
export class RiskCheckModule {}
