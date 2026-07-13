import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { randomUUID } from 'node:crypto';
import { DomainError } from './domain-error';

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
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
      const message =
        typeof body === 'string'
          ? body
          : this.extractMessage(body as Record<string, unknown>, error.message);
      response.status(error.getStatus()).json({
        code: `HTTP_${error.getStatus()}`,
        message,
        details: typeof body === 'object' ? body : {},
        traceId,
      });
      return;
    }

    if (process.env.NODE_ENV === 'test') {
      console.error(error);
    }

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
}
