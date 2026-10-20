import { ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { RequestIdInterceptor } from './request-id.interceptor';

describe('RequestIdInterceptor', () => {
  let interceptor: RequestIdInterceptor;

  beforeEach(() => {
    interceptor = new RequestIdInterceptor();
  });

  it('generates a new UUID if header is missing or malformed', (done) => {
    let setHeaderValue = '';
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-request-id': 'invalid\r\nheader' },
          method: 'GET',
          url: '/test',
        }),
        getResponse: () => ({
          setHeader: (name: string, value: string) => {
            if (name === 'x-request-id') setHeaderValue = value;
          },
          statusCode: 200,
          once: jest.fn(),
        }),
      }),
    } as unknown as ExecutionContext;

    const mockCallHandler = {
      handle: () => of('data'),
    };

    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      complete: () => {
        expect(setHeaderValue).toMatch(/^[0-9a-fA-F-]{36}$/);
        done();
      },
    });
  });

  it('preserves valid alphanumeric x-request-id header', (done) => {
    let setHeaderValue = '';
    const validId = 'req-12345-valid_id';
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'x-request-id': validId },
          method: 'GET',
          url: '/test',
        }),
        getResponse: () => ({
          setHeader: (name: string, value: string) => {
            if (name === 'x-request-id') setHeaderValue = value;
          },
          statusCode: 200,
          once: jest.fn(),
        }),
      }),
    } as unknown as ExecutionContext;

    const mockCallHandler = {
      handle: () => of('data'),
    };

    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      complete: () => {
        expect(setHeaderValue).toBe(validId);
        done();
      },
    });
  });
});
