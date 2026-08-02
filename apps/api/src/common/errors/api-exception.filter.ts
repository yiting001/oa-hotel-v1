import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { DomainError } from './domain-error';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(error: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const traceId = randomUUID();

    if (error instanceof DomainError) {
      response.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
        code: error.code,
        message: error.message,
        details: error.details,
        traceId,
      });
      return;
    }

    if (error instanceof HttpException) {
      const body = error.getResponse();
      const details = typeof body === 'object' ? (body as Record<string, unknown>) : {};
      const message = typeof body === 'string' ? body : this.extractMessage(details, error.message);
      response.status(error.getStatus()).json({
        code: typeof details.code === 'string' ? details.code : `HTTP_${error.getStatus()}`,
        message,
        details: this.extractDetails(details),
        traceId,
      });
      return;
    }

    const stack = error instanceof Error ? error.stack : undefined;
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`未处理异常 traceId=${traceId}: ${message}`, stack);

    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'INTERNAL_SERVER_ERROR',
      message: '系统处理失败',
      details: {},
      traceId,
    });
  }

  private extractMessage(body: Record<string, unknown>, fallback: string): string {
    const message = body.message;
    if (Array.isArray(message)) {
      return message.join('；');
    }
    return typeof message === 'string' ? message : fallback;
  }

  private extractDetails(body: Record<string, unknown>): Record<string, unknown> {
    const details = body.details;
    return details && typeof details === 'object' ? (details as Record<string, unknown>) : body;
  }
}
