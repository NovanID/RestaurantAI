import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super();
    this.$use(async (params, next) => {
      const startedAt = Date.now();
      try {
        return await next(params);
      } finally {
        this.logger.log(JSON.stringify({
          event: 'db_query',
          model: params.model,
          action: params.action,
          latency_ms: Date.now() - startedAt,
        }));
      }
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
