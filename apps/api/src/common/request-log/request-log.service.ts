import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RequestLogEntity } from './request-log.entity';

const BODY_MAX_LENGTH = 8_000;
const SENSITIVE_KEYS = ['password', 'newpassword', 'oldpassword', 'accesstoken', 'token', 'secret'];

export interface RequestLogRecord {
  traceId: string;
  method: string;
  path: string;
  query: string | null;
  statusCode: number;
  durationMs: number;
  actorId: string | null;
  actorName: string | null;
  requestBody: string | null;
  responseBody: string | null;
  errorMessage: string | null;
  errorStack: string | null;
}

export interface RequestLogQueryInput {
  traceId?: string;
  path?: string;
  method?: string;
  actor?: string;
  status?: 'success' | 'error';
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export function serializeBody(body: unknown): string | null {
  if (body === undefined || body === null) return null;
  try {
    const text = typeof body === 'string' ? body : JSON.stringify(sanitize(body));
    if (!text || text === '{}' || text === 'null') return null;
    return text.length > BODY_MAX_LENGTH ? `${text.slice(0, BODY_MAX_LENGTH)}…[截断]` : text;
  } catch {
    return '[无法序列化]';
  }
}

function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SENSITIVE_KEYS.includes(key.toLowerCase()) ? '***' : sanitize(entry);
    }
    return result;
  }
  return value;
}

@Injectable()
export class RequestLogService {
  private readonly logger = new Logger(RequestLogService.name);

  constructor(
    @InjectRepository(RequestLogEntity)
    private readonly logs: Repository<RequestLogEntity>,
  ) {}

  async record(entry: RequestLogRecord): Promise<void> {
    try {
      await this.logs.insert({
        id: `reqlog-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
        ...entry,
      });
    } catch (error) {
      this.logger.warn(
        `请求日志写入失败 traceId=${entry.traceId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async search(input: RequestLogQueryInput): Promise<RequestLogEntity[]> {
    const qb = this.logs.createQueryBuilder('log');
    if (input.traceId?.trim()) {
      qb.andWhere('log.trace_id LIKE :traceId', { traceId: `%${input.traceId.trim()}%` });
    }
    if (input.path?.trim()) {
      qb.andWhere('log.path LIKE :path', { path: `%${input.path.trim()}%` });
    }
    if (input.method?.trim()) {
      qb.andWhere('log.method = :method', { method: input.method.trim().toUpperCase() });
    }
    if (input.actor?.trim()) {
      qb.andWhere('(log.actor_name LIKE :actor OR log.actor_id LIKE :actor)', {
        actor: `%${input.actor.trim()}%`,
      });
    }
    if (input.status === 'success') {
      qb.andWhere('log.status_code < 400');
    } else if (input.status === 'error') {
      qb.andWhere('log.status_code >= 400');
    }
    if (input.dateFrom) {
      qb.andWhere('log.created_at >= :dateFrom', { dateFrom: `${input.dateFrom} 00:00:00` });
    }
    if (input.dateTo) {
      qb.andWhere('log.created_at <= :dateTo', { dateTo: `${input.dateTo} 23:59:59.999` });
    }
    qb.orderBy('log.created_at', 'DESC').limit(Math.min(input.limit ?? 200, 500));
    return qb.getMany();
  }
}
