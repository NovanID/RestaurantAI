import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  keyPrefix?: string;
}

interface WindowRecord {
  count: number;
  resetAt: number;
}

@Injectable()
export class MemoryRateLimitService {
  private readonly store = new Map<string, WindowRecord>();

  checkLimit(key: string, config: RateLimitConfig): void {
    const now = Date.now();
    const record = this.store.get(key);

    if (!record || now >= record.resetAt) {
      this.store.set(key, {
        count: 1,
        resetAt: now + config.windowMs,
      });
      return;
    }

    if (record.count >= config.maxRequests) {
      const waitSec = Math.ceil((record.resetAt - now) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: config.message || `Terlalu banyak permintaan. Silakan coba lagi dalam ${waitSec} detik.`,
          retryAfter: waitSec,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    record.count += 1;
  }

  reset(key: string): void {
    this.store.delete(key);
  }
}

export interface DynamicRateLimiter {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any>;
}

export function createRateLimitInterceptor(config: RateLimitConfig) {
  @Injectable()
  class RateLimitInterceptor implements DynamicRateLimiter {
    readonly rateLimitService: MemoryRateLimitService;

    constructor(rateLimitService: MemoryRateLimitService) {
      this.rateLimitService = rateLimitService;
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
      const req = context.switchToHttp().getRequest();
      const ip = req.socket?.remoteAddress || req.ip || '127.0.0.1';
      const key = `${config.keyPrefix || 'rl'}:ip:${ip}`;
      this.rateLimitService.checkLimit(key, config);

      return next.handle();
    }
  }

  return RateLimitInterceptor;
}
