import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { OutlinesController } from "./outlines.controller";
import { OutlinesService } from "./outlines.service";

@Module({
  imports: [PrismaModule],
  controllers: [OutlinesController],
  providers: [OutlinesService],
  exports: [OutlinesService]
})
export class OutlinesModule {}
