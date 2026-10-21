import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Reservation Concurrency (50 requests to 1 slot)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantId: string;
  let outletId: string;
  const targetDate = '2026-11-20';
  const targetTime = '13:00';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    const runId = Date.now().toString(36);
    const tenant = await prisma.tenant.create({
      data: { name: `Concurrency Test ${runId}`, slug: `concurrency-test-${runId}` },
    });
    tenantId = tenant.id;
    const outlet = await prisma.outlet.create({
      data: {
        tenantId,
        name: 'Concurrency Test Outlet',
        slug: `concurrency-outlet-${runId}`,
        minNoticeMinutes: 0,
      },
    });
    outletId = outlet.id;

    await prisma.openingHour.createMany({
      data: Array.from({ length: 7 }, (_, weekday) => ({
        tenantId,
        outletId,
        weekday,
        openTime: '09:00',
        closeTime: '22:00',
      })),
    });
    await prisma.restaurantTable.create({
      data: {
        tenantId,
        outletId,
        tableNumber: 'CONCURRENCY-1',
        capacity: 4,
      },
    });
  }, 30000);

  afterAll(async () => {
    if (tenantId) {
      await prisma.tenant.delete({ where: { id: tenantId } });
    }
    if (app) {
      await app.close();
    }
  });

  it('allows exactly 1 reservation and returns 409 for the remaining 49 requests', async () => {
    const totalRequests = 50;

    const requests = Array.from({ length: totalRequests }).map((_, index) => {
      return request(app.getHttpServer())
        .post('/reservations')
        .send({
          outletId,
          date: targetDate,
          time: targetTime,
          partySize: 2,
          name: `Tamu Uji Konkurensi ${index + 1}`,
          phone: `08129999${String(index).padStart(4, '0')}`,
          notes: `Simultaneous test request #${index + 1}`,
        });
    });

    const responses = await Promise.all(requests);

    const successResponses = responses.filter((r) => r.status === 201);
    const conflictResponses = responses.filter(
      (r) => r.status === 409 && r.body?.code === 'SLOT_TAKEN',
    );

    expect(successResponses.length).toBe(1);
    expect(conflictResponses.length).toBe(totalRequests - 1);

    const createdRecord = successResponses[0].body?.data ?? successResponses[0].body;
    expect(createdRecord).toHaveProperty('code');
    expect(createdRecord.code).toMatch(/^RSV-/);

    const dbCount = await prisma.reservation.count({
      where: {
        tenantId,
        outletId,
        startAt: {
          equals: new Date(`${targetDate}T${targetTime}:00+07:00`),
        },
        status: { in: ['pending', 'confirmed'] },
      },
    });
    expect(dbCount).toBe(1);
  }, 60000);
});
