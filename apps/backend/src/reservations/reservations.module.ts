import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AvailabilityModule } from '../availability/availability.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
import { ReservationExpiryScheduler } from './reservation-expiry.scheduler';

@Module({
  imports: [AuthModule, PrismaModule, AvailabilityModule, CommonModule],
  controllers: [ReservationsController],
  providers: [ReservationsService, ReservationExpiryScheduler],
  exports: [ReservationsService],
})
export class ReservationsModule {}
