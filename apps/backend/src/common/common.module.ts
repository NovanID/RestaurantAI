import { Module } from '@nestjs/common';
import { MemoryRateLimitService } from './rate-limit.service';

@Module({
  providers: [MemoryRateLimitService],
  exports: [MemoryRateLimitService],
})
export class CommonModule {}
