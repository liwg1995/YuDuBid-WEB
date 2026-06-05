import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { StorageModule } from "../storage/storage.module";
import { TasksController } from "./tasks.controller";
import { TasksProcessor } from "./tasks.processor";
import { TasksService } from "./tasks.service";

@Module({
  imports: [BullModule.registerQueue({ name: "bidkit-tasks" }), StorageModule],
  controllers: [TasksController],
  providers: [TasksService, TasksProcessor],
  exports: [TasksService]
})
export class TasksModule {}
