import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe.skip('Reservation Concurrency (50 requests to 1 slot)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let outletId: string;
  let tableId: string;
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

    // Pick first outlet and table
    const outlet = await prisma.outlet.findFirstOrThrow({ where: { slug: 'kemang' } });
    outletId = outlet.id;

    const table = await prisma.restaurantTable.findFirstOrThrow({
      where: { outletId, status: 'active' },
    });
    tableId = table.id;

    // Clean any conflicting reservations for this specific test window
    await prisma.reservation.deleteMany({
      where: {
        outletId,
        startAt: {
          gte: new Date(`${targetDate}T10:00:00+07:00`),
          lte: new Date(`${targetDate}T22:00:00+07:00`),
        },
      },
    });
  }, 30000);

  afterAll(async () => {
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

    // Verify DB count
    const dbCount = await prisma.reservation.count({
      where: {
        outletId,
        startAt: new Date(`${targetDate}T${targetTime}:00+07:00`),
        status: { in: ['pending', 'confirmed'] },
      },
    });
    expect(dbCount).toBe(1);
  }, 60000);
});
