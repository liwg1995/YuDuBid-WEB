import { Module } from "@nestjs/common";
import { TasksModule } from "../tasks/tasks.module";
import { DuplicateCheckController } from "./duplicate-check.controller";
import { DuplicateCheckService } from "./duplicate-check.service";

@Module({
  imports: [TasksModule],
  controllers: [DuplicateCheckController],
  providers: [DuplicateCheckService],
  exports: [DuplicateCheckService]
})
export class DuplicateCheckModule {}
