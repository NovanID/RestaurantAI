import { Prisma } from '@prisma/client';

export async function recordAdminAudit(
  tx: Prisma.TransactionClient,
  tenantId: string,
  actorId: string,
  entityType: string,
  entityId: string,
  action: string,
  before: unknown,
  after: unknown,
) {
  // Prisma records contain dates and decimals; persist their JSON representation.
  const snapshot = (value: unknown) => value == null
    ? Prisma.JsonNull
    : JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  await tx.auditEvent.create({
    data: {
      tenantId, actorType: 'staff', actorId, entityType, entityId,
      action: `${entityType}.${action}`,
      before: snapshot(before), after: snapshot(after),
    },
  });
}
