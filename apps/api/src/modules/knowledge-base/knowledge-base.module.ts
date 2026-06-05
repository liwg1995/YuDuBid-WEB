import { Module } from "@nestjs/common";
import { StorageModule } from "../storage/storage.module";
import { KnowledgeBaseController } from "./knowledge-base.controller";
import { KnowledgeBaseService } from "./knowledge-base.service";

@Module({
  imports: [StorageModule],
  controllers: [KnowledgeBaseController],
  providers: [KnowledgeBaseService],
  exports: [KnowledgeBaseService]
})
export class KnowledgeBaseModule {}
