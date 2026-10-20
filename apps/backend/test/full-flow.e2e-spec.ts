import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Full Lifecycle Flow E2E (Bug Bash)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let tenantId: string;
  let outletId: string;
  let tableId: string;
  let reservationCode: string;

  beforeAll(async () => {
    process.env.JWT_SECRET = 'full_lifecycle_e2e_jwt_secret_testing_32chars_min';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Create isolated test tenant fixture
    const tenant = await prisma.tenant.create({
      data: {
        name: 'E2E Full Flow Tenant',
        slug: `e2e-flow-${Date.now()}`,
      },
    });
    tenantId = tenant.id;

    const outlet = await prisma.outlet.create({
      data: {
        tenantId,
        name: 'E2E Central Outlet',
        slug: `e2e-central-${Date.now()}`,
      },
    });
    outletId = outlet.id;

    const area = await prisma.diningArea.create({
      data: {
        tenantId,
        outletId,
        name: 'Indoor Area',
      },
    });

    await prisma.restaurantTable.create({
      data: {
        tenantId,
        outletId,
        areaId: area.id,
        tableNumber: 'FLOW-1',
        capacity: 4,
        status: 'active',
      },
    });

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
  });

  afterAll(async () => {
    if (tenantId && prisma) {
      await prisma.reservation.deleteMany({ where: { tenantId } });
      await prisma.openingHour.deleteMany({ where: { tenantId } });
      await prisma.restaurantTable.deleteMany({ where: { tenantId } });
      await prisma.diningArea.deleteMany({ where: { tenantId } });
      await prisma.outlet.deleteMany({ where: { tenantId } });
      await prisma.tenant.deleteMany({ where: { id: tenantId } });
    }
    await app.close();
  });

  it('1. GET /api/v1/health should return ok and db connected', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    const body = res.body.data ?? res.body;
    expect(body.status).toBe('ok');
    expect(body.database).toBe('connected');
  });

  it('2. GET /api/v1/availability should show slot available', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 10);

    const res = await request(app.getHttpServer())
      .get(`/api/v1/availability?outletId=${outletId}&date=${dateStr}&time=12:00&partySize=2`)
      .expect(200);

    const body = res.body.data ?? res.body;
    expect(body.available).toBe(true);
    expect(Array.isArray(body.tables)).toBe(true);
  });

  it('3. POST /api/v1/reservations should successfully create a booking', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().slice(0, 10);

    const res = await request(app.getHttpServer())
      .post('/api/v1/reservations')
      .send({
        outletId,
        date: dateStr,
        time: '12:00',
        partySize: 2,
        name: 'Budi Santoso',
        phone: '081298765432',
        notes: 'Meja dekat jendela',
        idempotencyKey: `flow-key-${Date.now()}`,
      })
      .expect(201);

    const body = res.body.data ?? res.body;
    expect(body.code).toBeDefined();
    expect(body.status).toBe('pending');
    reservationCode = body.code;
  });

  it('4. POST /api/v1/reservations/verify should retrieve reservation by code + phoneLast4', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/reservations/verify')
      .send({
        code: reservationCode,
        phoneLast4: '5432',
      })
      .expect(201);

    const body = res.body.data ?? res.body;
    expect(body.code).toBe(reservationCode);
    expect(body.customer.name).toBe('Budi Santoso');
  });

  it('5. POST /api/v1/reservations/verify should reject with wrong phone digits', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/reservations/verify')
      .send({
        code: reservationCode,
        phoneLast4: '9999',
      })
      .expect(404);
  });

  it('6. POST /api/v1/reservations/:code/cancel should cancel the reservation', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/reservations/${reservationCode}/cancel`)
      .send({
        phoneLast4: '5432',
      })
      .expect(201);

    const body = res.body.data ?? res.body;
    expect(body.status).toBe('cancelled');
  });
});
