import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ReservationsService } from './reservations.service';

@Injectable()
export class ReservationExpiryScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReservationExpiryScheduler.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly reservationsService: ReservationsService) {}

  onModuleInit() {
    this.timer = setInterval(async () => {
      try {
        const res = await this.reservationsService.expirePending();
        if (res.expired > 0) {
          this.logger.log(`Otomatis menandai ${res.expired} reservasi pending kedaluwarsa.`);
        }
      } catch (err: any) {
        this.logger.error(`Gagal mengecek kedaluwarsa reservasi: ${err.message}`);
      }
    }, 60_000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
