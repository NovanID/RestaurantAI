import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { randomBytes } from 'crypto';


  let app: INestApplication;
  let prisma: PrismaService;
  let tenantId: string;
  let outletId: string;

  const targetTime = '13:00';

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);


      },
    });
    outletId = outlet.id;


    await prisma.restaurantTable.create({
      data: {
        tenantId,
        outletId,

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
