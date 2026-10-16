import { ReservationExpiryScheduler } from './reservation-expiry.scheduler';

describe('ReservationExpiryScheduler', () => {
  let scheduler: ReservationExpiryScheduler;
  let reservationsService: any;

  beforeEach(() => {
    jest.useFakeTimers();
    reservationsService = {
      expirePending: jest.fn().mockResolvedValue({ expired: 2 }),
    };
    scheduler = new ReservationExpiryScheduler(reservationsService);
  });

  afterEach(() => {
    scheduler.onModuleDestroy();
    jest.useRealTimers();
  });

  it('triggers expirePending periodically on module init', async () => {
    scheduler.onModuleInit();
    expect(reservationsService.expirePending).not.toHaveBeenCalled();

    jest.advanceTimersByTime(60_000);
    await Promise.resolve(); // flush microtasks

    expect(reservationsService.expirePending).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(60_000);
    await Promise.resolve();

    expect(reservationsService.expirePending).toHaveBeenCalledTimes(2);
  });

  it('stops timer on module destroy', () => {
    scheduler.onModuleInit();
    scheduler.onModuleDestroy();

    jest.advanceTimersByTime(120_000);
    expect(reservationsService.expirePending).not.toHaveBeenCalled();
  });
});
