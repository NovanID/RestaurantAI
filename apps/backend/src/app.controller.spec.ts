import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;

  const mockPrisma = {
    $queryRaw: jest.fn().mockResolvedValue([{ 1: 1 }]),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });

  describe('health', () => {
    it('should return status ok when db is reachable', async () => {
      const res = await appController.getHealth();
      expect(res.status).toBe('ok');
      expect(res.database).toBe('connected');
    });

    it('should throw ServiceUnavailableException when db is disconnected', async () => {
      mockPrisma.$queryRaw.mockRejectedValueOnce(new Error('Connection failed'));
      await expect(appController.getHealth()).rejects.toThrow();
    });
  });
});
