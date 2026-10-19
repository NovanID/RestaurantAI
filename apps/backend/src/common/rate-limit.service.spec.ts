import { HttpException } from '@nestjs/common';
import { MemoryRateLimitService } from './rate-limit.service';

describe('MemoryRateLimitService', () => {
  it('allows configured requests then rejects within the window', () => {
    const service = new MemoryRateLimitService();
    const config = { windowMs: 60_000, maxRequests: 2 };

    service.checkLimit('ip:1', config);
    service.checkLimit('ip:1', config);
    expect(() => service.checkLimit('ip:1', config)).toThrow(HttpException);
  });

  it('tracks separate client keys independently', () => {
    const service = new MemoryRateLimitService();
    const config = { windowMs: 60_000, maxRequests: 1 };

    service.checkLimit('ip:1', config);
    expect(() => service.checkLimit('ip:2', config)).not.toThrow();
  });
});
