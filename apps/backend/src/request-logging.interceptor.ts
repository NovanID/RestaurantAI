import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { RequestWithId } from './request-id.middleware';

@Injectable()
export class RequestLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RequestLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestWithId>();
    const response = context.switchToHttp().getResponse<{ statusCode: number }>();
    const startedAt = Date.now();
    const log = (status: number) => this.logger.log(JSON.stringify({
      event: 'http_request',
      request_id: request.requestId,
      method: request.method,
      path: request.path,
      status,
      latency_ms: Date.now() - startedAt,
    }));
    return next.handle().pipe(tap({ next: () => log(response.statusCode), error: (error) => log(error?.status ?? 500) }));
  }
}
