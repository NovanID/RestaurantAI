import { Module } from '@nestjs/common';
import { LlmClient } from './llm.client';
import { AiToolsService } from './ai-tools.service';
import { AiChatController } from './ai-chat.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AvailabilityModule } from '../availability/availability.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, AvailabilityModule, ReservationsModule, CommonModule],
  controllers: [AiChatController],
  providers: [LlmClient, AiToolsService],
  exports: [LlmClient, AiToolsService],
})
export class AiModule {}
