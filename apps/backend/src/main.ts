import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './response.interceptor';
import { RequestIdInterceptor } from './request-id.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { requestIdMiddleware } from './request-id.middleware';
import { RequestLoggingInterceptor } from './request-logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api/v1');
  app.use(requestIdMiddleware);

  // Serve static uploaded media files
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });


  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    exposedHeaders: ['x-request-id'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,              // Strip non-whitelisted properties
      transform: true,              // Auto-transform payloads to DTO instances
      forbidNonWhitelisted: false,  // Log warnings for unknown properties (set true in production)
      validateCustomDecorators: true, // Validate custom decorators
      stopAtFirstError: false,      // Show all errors at once
    }),
  );

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Backend running on port ${port} with prefix /api/v1`);
}
bootstrap();
