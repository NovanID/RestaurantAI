import { HttpException, HttpStatus } from '@nestjs/common';

const buckets = new Map<string, number[]>();

export function enforceRateLimit(bucket: string, limit: number, windowMs: number) {
  const now = Date.now();
  const recent = (buckets.get(bucket) ?? []).filter((timestamp) => timestamp > now - windowMs);
  if (recent.length >= limit) {
    throw new HttpException('Terlalu banyak permintaan. Silakan coba lagi sebentar.', HttpStatus.TOO_MANY_REQUESTS);
  }
  recent.push(now);
  buckets.set(bucket, recent);
}
