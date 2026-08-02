import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ApiExceptionFilter } from './common/errors/api-exception.filter';
import { createRequestLogMiddleware } from './common/request-log/request-log.middleware';
import { RequestLogService } from './common/request-log/request-log.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();
  app.setGlobalPrefix('api/v1');
  configureCors(app);
  app.use(createRequestLogMiddleware(app.get(RequestLogService)));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ApiExceptionFilter());

  if (swaggerEnabled()) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('OA Hotel API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));
  }

  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST?.trim() || '0.0.0.0';
  await app.listen(port, host);
}

function configureCors(app: Awaited<ReturnType<typeof NestFactory.create>>): void {
  const configuredOrigins = (process.env.OA_CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (configuredOrigins.length > 0) {
    app.enableCors({ origin: configuredOrigins, credentials: true });
  } else if (process.env.NODE_ENV !== 'production') {
    app.enableCors({ origin: true, credentials: true });
  }
}

function swaggerEnabled(): boolean {
  const configured = process.env.OA_SWAGGER_ENABLED?.trim().toLowerCase();
  return configured ? configured === 'true' : process.env.NODE_ENV !== 'production';
}

void bootstrap().catch((error: unknown) => {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  process.stderr.write(`API startup failed: ${message}\n`);
  process.exitCode = 1;
});
