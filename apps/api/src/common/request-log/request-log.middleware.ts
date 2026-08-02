import type { SessionUser } from '@oa/contracts';
import type { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { RequestLogService, serializeBody } from './request-log.service';

export const TRACE_ID_KEY = 'oaTraceId';
export const ERROR_MESSAGE_KEY = 'oaErrorMessage';
export const ERROR_STACK_KEY = 'oaErrorStack';

interface TracedRequest extends Request {
  [TRACE_ID_KEY]?: string;
  [ERROR_MESSAGE_KEY]?: string;
  [ERROR_STACK_KEY]?: string;
  user?: SessionUser;
}

/** 请求日志中不落库的路径（避免自我循环与噪音）。 */
const SKIP_PATHS = ['/api/v1/insight/request-logs'];

/**
 * 请求级日志中间件：为每个请求生成 traceId（响应头 X-Trace-Id 回传），
 * 捕获出参入参、耗时、操作人与错误栈并落库。
 */
export function createRequestLogMiddleware(service: RequestLogService) {
  return (req: TracedRequest, res: Response, next: NextFunction): void => {
    const traceId = randomUUID();
    req[TRACE_ID_KEY] = traceId;
    res.setHeader('X-Trace-Id', traceId);
    const startedAt = Date.now();

    let responseBody: unknown;
    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      responseBody = body;
      return originalJson(body);
    }) as Response['json'];

    res.on('finish', () => {
      const path = (req.originalUrl ?? req.url).split('?')[0];
      if (SKIP_PATHS.some((skip) => path.startsWith(skip))) return;
      if (!path.startsWith('/api/')) return;
      const queryIndex = (req.originalUrl ?? req.url).indexOf('?');
      void service.record({
        traceId,
        method: req.method,
        path,
        query: queryIndex >= 0 ? (req.originalUrl ?? req.url).slice(queryIndex + 1) : null,
        statusCode: res.statusCode,
        durationMs: Date.now() - startedAt,
        actorId: req.user?.id ?? null,
        actorName: req.user?.displayName ?? req.user?.username ?? null,
        requestBody: serializeBody(req.body),
        responseBody: serializeBody(responseBody),
        errorMessage: req[ERROR_MESSAGE_KEY] ?? null,
        errorStack: req[ERROR_STACK_KEY] ?? null,
      });
    });

    next();
  };
}
