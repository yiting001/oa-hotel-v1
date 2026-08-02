import { HttpException, HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import type { LoginAttemptStateEntity } from './login-attempt-state.entity';
import { LoginAttemptStateRepository } from './login-attempt-state.repository';

const DEFAULT_MAX_FAILURES = 5;
const DEFAULT_LOCK_MS = 15 * 60 * 1000;
const DEFAULT_MAX_TRACKED_ACCOUNTS = 10_000;
const MAX_FAILURES_UPPER_BOUND = 100;
const LOCK_MS_UPPER_BOUND = 24 * 60 * 60 * 1000;
const MAX_TRACKED_ACCOUNTS_UPPER_BOUND = 1_000_000;
const CLEANUP_INTERVAL = 64;

export interface LoginAttemptReservation {
  username: string;
  generation: string;
  attemptNumber: number;
}

@Injectable()
export class LoginAttemptLimiter {
  private readonly logger = new Logger(LoginAttemptLimiter.name);
  private readonly logFingerprintKey = randomBytes(32);
  private readonly maxFailures: number;
  private readonly lockMs: number;
  private readonly maxTrackedAccounts: number;
  private operationCount = 0;
  private operationQueue: Promise<void> = Promise.resolve();

  constructor(
    @Inject(LoginAttemptStateRepository)
    private readonly repository: LoginAttemptStateRepository,
  ) {
    this.maxFailures = readPositiveInteger(
      'OA_LOGIN_MAX_FAILURES',
      DEFAULT_MAX_FAILURES,
      MAX_FAILURES_UPPER_BOUND,
    );
    this.lockMs = readPositiveInteger('OA_LOGIN_LOCK_MS', DEFAULT_LOCK_MS, LOCK_MS_UPPER_BOUND);
    this.maxTrackedAccounts = readPositiveInteger(
      'OA_LOGIN_MAX_TRACKED_ACCOUNTS',
      DEFAULT_MAX_TRACKED_ACCOUNTS,
      MAX_TRACKED_ACCOUNTS_UPPER_BOUND,
    );
  }

  reserve(username: string): Promise<LoginAttemptReservation> {
    return this.runExclusive(async () => {
      const normalizedUsername = normalizeLoginUsername(username);
      const now = Date.now();
      await this.cleanup(now);

      let state = await this.repository.find(normalizedUsername);
      if (state && state.expiresAt.getTime() <= now) {
        await this.repository.delete(normalizedUsername, state.generation);
        state = null;
      }
      if (state && state.attempts >= this.maxFailures) {
        throw this.rateLimited(state.expiresAt.getTime(), now);
      }
      if (!state) {
        await this.ensureCapacity(now);
        state = await this.repository.create({
          username: normalizedUsername,
          generation: randomUUID(),
          attempts: 1,
          expiresAt: new Date(now + this.lockMs),
          updatedAt: new Date(now),
        });
        return {
          username: normalizedUsername,
          generation: state.generation,
          attemptNumber: state.attempts,
        };
      }

      state.attempts += 1;
      state.expiresAt = new Date(now + this.lockMs);
      state.updatedAt = new Date(now);
      await this.repository.save(state);
      return {
        username: normalizedUsername,
        generation: state.generation,
        attemptNumber: state.attempts,
      };
    });
  }

  recordFailure(reservation: LoginAttemptReservation): Promise<void> {
    return this.runExclusive(async () => {
      const state = await this.currentState(reservation);
      if (!state || reservation.attemptNumber < this.maxFailures) return;

      const now = Date.now();
      state.expiresAt = new Date(now + this.lockMs);
      state.updatedAt = new Date(now);
      await this.repository.save(state);
      this.logAccountLock(reservation.username, state.expiresAt.getTime(), now);
      throw this.rateLimited(state.expiresAt.getTime(), now);
    });
  }

  recordSuccess(reservation: LoginAttemptReservation): Promise<void> {
    return this.runExclusive(async () => {
      await this.repository.delete(reservation.username, reservation.generation);
    });
  }

  private async currentState(
    reservation: LoginAttemptReservation,
  ): Promise<LoginAttemptStateEntity | null> {
    const state = await this.repository.find(reservation.username);
    return state?.generation === reservation.generation ? state : null;
  }

  private async cleanup(now: number): Promise<void> {
    this.operationCount += 1;
    if (this.operationCount % CLEANUP_INTERVAL !== 0) return;
    await this.repository.deleteExpired(new Date(now));
  }

  private async ensureCapacity(now: number): Promise<void> {
    await this.repository.deleteExpired(new Date(now));
    if ((await this.repository.count()) < this.maxTrackedAccounts) return;

    const earliest = await this.repository.findEarliestExpiry();
    throw this.rateLimited(earliest?.expiresAt.getTime() ?? now + 1000, now);
  }

  private rateLimited(expiresAt: number, now: number): HttpException {
    const retryAfterSeconds = Math.max(1, Math.ceil((expiresAt - now) / 1000));
    return new HttpException(
      {
        code: 'LOGIN_RATE_LIMITED',
        message: '登录失败次数过多，请稍后重试',
        details: { retryAfterSeconds },
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private logAccountLock(username: string, expiresAt: number, now: number): void {
    const accountFingerprint = createHmac('sha256', this.logFingerprintKey)
      .update(username)
      .digest('hex')
      .slice(0, 16);
    this.logger.warn(
      JSON.stringify({
        event: 'LOGIN_ACCOUNT_LOCKED',
        accountFingerprint,
        retryAfterSeconds: Math.max(1, Math.ceil((expiresAt - now) / 1000)),
      }),
    );
  }

  private runExclusive<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.operationQueue.then(operation, operation);
    this.operationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }
}

export function normalizeLoginUsername(username: string): string {
  return username.trim().normalize('NFC');
}

function readPositiveInteger(name: string, fallback: number, upperBound: number): number {
  const configured = process.env[name];
  if (configured === undefined) return fallback;
  if (!/^[1-9]\d*$/.test(configured)) {
    throw new Error(`${name} 必须是严格的正整数`);
  }
  const value = Number(configured);
  if (!Number.isSafeInteger(value) || value > upperBound) {
    throw new Error(`${name} 不能大于 ${upperBound}`);
  }
  return value;
}
