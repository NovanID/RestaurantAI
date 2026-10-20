import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Observable } from 'rxjs';

const REQUEST_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestIdInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const rawHeader = request.headers['x-request-id'];
    const requestId = typeof rawHeader === 'string' && REQUEST_ID_REGEX.test(rawHeader)
      ? rawHeader
      : randomUUID();
    const startedAt = Date.now();

    request.id = requestId;
    response.setHeader('x-request-id', requestId);
    response.once('finish', () => {
      this.logger.log(JSON.stringify({
        message: 'request.complete',
        request_id: requestId,
        method: request.method,
        path: request.path || request.url?.split('?')[0],
        status_code: response.statusCode,
        latency_ms: Date.now() - startedAt,
      }));
    });

    return next.handle();
  }
}
