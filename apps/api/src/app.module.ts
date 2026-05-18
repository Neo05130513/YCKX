import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PrismaModule } from "./prisma/prisma.module";
import { MockModule } from "./mock/mock.module";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, MockModule],
})
export class AppModule {}
