import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { randomBytes } from 'crypto';

const runConcurrencyE2E = process.env.RUN_CONCURRENCY_E2E === 'true';

(runConcurrencyE2E ? describe : describe.skip)('Reservation Concurrency (50 requests to 1 slot)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantId: string;
  let outletId: string;
  const targetDate = new Date(Date.now() + 15 * 24 * 60 * 60_000)
    .toISOString()
    .slice(0, 10);
  const targetTime = '13:00';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // Create isolated test tenant with exactly 1 table to guarantee single-slot contention
    const testSlug = `concurrency-test-${randomBytes(4).toString('hex')}`;
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Concurrency Test Restaurant',
        slug: testSlug,
      },
    });
    tenantId = tenant.id;

    const outlet = await prisma.outlet.create({
      data: {
        tenantId,
        name: 'Single Table Outlet',
        slug: 'single-table',
        address: 'Test Address',
        phone: '081200000000',
        defaultDurationMinutes: 90,
        minNoticeMinutes: 0,
        maxAdvanceDays: 60,
        changeCutoffMinutes: 60,
        maxPartySize: 4,
        autoConfirm: false,
      },
    });
    outletId = outlet.id;

    const diningArea = await prisma.diningArea.create({
      data: {
        tenantId,
        outletId,
        name: 'Main Area',
      },
    });

    await prisma.restaurantTable.create({
      data: {
        tenantId,
        outletId,
        areaId: diningArea.id,
        tableNumber: 'Table-01',
        capacity: 4,
        status: 'active',
      },
    });

    // Opening hours 00:00 - 23:59 for all days
    for (let weekday = 0; weekday <= 6; weekday++) {
      await prisma.openingHour.create({
        data: {
          tenantId,
          outletId,
          weekday,
          openTime: '00:00',
          closeTime: '23:59',
          isClosed: false,
        },
      });
    }
  }, 30000);

  afterAll(async () => {
    if (tenantId && prisma) {
      await prisma.tenant.delete({
        where: { id: tenantId },
      });
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
