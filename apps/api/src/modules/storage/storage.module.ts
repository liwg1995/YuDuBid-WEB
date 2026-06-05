import { Module } from "@nestjs/common";
import { SystemConfigModule } from "../system-config/system-config.module";
import { StorageController } from "./storage.controller";
import { StorageService } from "./storage.service";

@Module({
  imports: [SystemConfigModule],
  controllers: [StorageController],
  providers: [StorageService],
  exports: [StorageService]
})
export class StorageModule {}
