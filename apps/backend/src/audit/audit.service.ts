import { Injectable } from '@nestjs/common';
import { ActorType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  write(
    data: {
      tenantId: string;
      actorType: ActorType;
      actorId?: string;
      action: string;
      entityType: string;
      entityId?: string;
      before?: Prisma.InputJsonValue;
      after?: Prisma.InputJsonValue;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.auditEvent.create({ data });
  }

  list(
    tenantId: string,
    options?: {
      entityType?: string;
      action?: string;
      limit?: number;
    },
  ) {
    return this.prisma.auditEvent.findMany({
      where: {
        tenantId,
        ...(options?.entityType ? { entityType: options.entityType } : {}),
        ...(options?.action ? { action: options.action } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit ?? 100,
    });
  }
}
