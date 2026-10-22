import { HttpException } from '@nestjs/common';
import { enforceRateLimit } from './rate-limit.util';

describe('enforceRateLimit', () => {
  it('rejects requests beyond the configured window limit', () => {
    const bucket = `test-${Date.now()}`;
    enforceRateLimit(bucket, 1, 60_000);

    expect(() => enforceRateLimit(bucket, 1, 60_000)).toThrow(HttpException);
  });
});
