import { Module } from "@nestjs/common";
import { MockAuthGuard } from "./mock-auth.guard";
import { MockController } from "./mock.controller";
import { MockService } from "./mock.service";

@Module({
  controllers: [MockController],
  providers: [MockService, MockAuthGuard],
})
export class MockModule {}
