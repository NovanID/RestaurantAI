import { requestIdMiddleware } from './request-id.middleware';

describe('requestIdMiddleware', () => {
  it('uses a safe incoming ID and returns it in the response header', () => {
    const setHeader = jest.fn();
    const next = jest.fn();
    const req = { header: jest.fn().mockReturnValue('request_12345678') } as any;

    requestIdMiddleware(req, { setHeader } as any, next);

    expect(req.requestId).toBe('request_12345678');
    expect(setHeader).toHaveBeenCalledWith('x-request-id', 'request_12345678');
    expect(next).toHaveBeenCalledTimes(1);
  });
});
