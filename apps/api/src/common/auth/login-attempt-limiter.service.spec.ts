import { HttpException, Logger } from '@nestjs/common';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginAttemptLimiter } from './login-attempt-limiter.service';
import { LoginAttemptStateEntity } from './login-attempt-state.entity';
import { LoginAttemptStateRepository } from './login-attempt-state.repository';

describe('LoginAttemptLimiter', () => {
  const originalMaxFailures = process.env.OA_LOGIN_MAX_FAILURES;
  const originalLockMs = process.env.OA_LOGIN_LOCK_MS;
  const originalMaxTrackedAccounts = process.env.OA_LOGIN_MAX_TRACKED_ACCOUNTS;
  const temporaryRoots: string[] = [];
  let dataSource: DataSource;
  let repository: LoginAttemptStateRepository;

  beforeEach(async () => {
    process.env.OA_LOGIN_MAX_FAILURES = '2';
    process.env.OA_LOGIN_LOCK_MS = '60000';
    process.env.OA_LOGIN_MAX_TRACKED_ACCOUNTS = '10000';
    dataSource = await createDataSource(':memory:');
    repository = new LoginAttemptStateRepository(dataSource.getRepository(LoginAttemptStateEntity));
  });

  afterEach(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, { recursive: true })));
    restoreEnvironment('OA_LOGIN_MAX_FAILURES', originalMaxFailures);
    restoreEnvironment('OA_LOGIN_LOCK_MS', originalLockMs);
    restoreEnvironment('OA_LOGIN_MAX_TRACKED_ACCOUNTS', originalMaxTrackedAccounts);
    vi.restoreAllMocks();
  });

  it('serializes concurrent reservations before password verification starts', async () => {
    const limiter = createLimiter(repository);

    const reservations = await Promise.all([limiter.reserve('张三'), limiter.reserve('张三')]);

    expect(reservations.map((item) => item.attemptNumber).sort()).toEqual([1, 2]);
    await expectRateLimited(() => limiter.reserve('张三'));
  });

  it('uses trimmed NFC-normalized usernames as one limiter key', async () => {
    const limiter = createLimiter(repository);
    const decomposed = await limiter.reserve('  e\u0301  ');
    const composed = await limiter.reserve('é');

    expect(decomposed.username).toBe('é');
    expect(composed).toMatchObject({ username: 'é', attemptNumber: 2 });
    await expectRateLimited(() => limiter.reserve('e\u0301'));
  });

  it('allows login attempts again after the lock expires', async () => {
    process.env.OA_LOGIN_MAX_FAILURES = '1';
    let now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const limiter = createLimiter(repository);
    const failedAttempt = await limiter.reserve('李四');
    await expectRateLimited(() => limiter.recordFailure(failedAttempt));

    now += 60_001;
    await expect(limiter.reserve('李四')).resolves.toMatchObject({ attemptNumber: 1 });
  });

  it('logs a structured lock event without exposing the account name', async () => {
    process.env.OA_LOGIN_MAX_FAILURES = '1';
    const warning = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const limiter = createLimiter(repository);
    const failedAttempt = await limiter.reserve('告警测试账号');

    await expectRateLimited(() => limiter.recordFailure(failedAttempt));

    expect(warning).toHaveBeenCalledOnce();
    const payload = String(warning.mock.calls[0]?.[0]);
    expect(payload).toContain('LOGIN_ACCOUNT_LOCKED');
    expect(payload).toContain('accountFingerprint');
    expect(payload).not.toContain('告警测试账号');
  });

  it.each([
    ['OA_LOGIN_MAX_FAILURES', '0'],
    ['OA_LOGIN_MAX_FAILURES', '-1'],
    ['OA_LOGIN_MAX_FAILURES', '1.5'],
    ['OA_LOGIN_MAX_FAILURES', ' 5'],
    ['OA_LOGIN_MAX_FAILURES', '101'],
    ['OA_LOGIN_LOCK_MS', '0'],
    ['OA_LOGIN_LOCK_MS', '-1'],
    ['OA_LOGIN_LOCK_MS', '1.5'],
    ['OA_LOGIN_LOCK_MS', ' 60000'],
    ['OA_LOGIN_LOCK_MS', '86400001'],
    ['OA_LOGIN_MAX_TRACKED_ACCOUNTS', '0'],
    ['OA_LOGIN_MAX_TRACKED_ACCOUNTS', '1000001'],
  ])('rejects invalid limiter configuration %s=%s', (name, value) => {
    process.env[name] = value;

    expect(() => createLimiter(repository)).toThrowError(name);
  });

  it('uses five failures and fifteen minutes when limiter configuration is absent', async () => {
    delete process.env.OA_LOGIN_MAX_FAILURES;
    delete process.env.OA_LOGIN_LOCK_MS;
    const limiter = createLimiter(repository);
    for (let attempt = 0; attempt < 5; attempt += 1) await limiter.reserve('默认配置用户');

    const error = await captureHttpException(() => limiter.reserve('默认配置用户'));
    expect(error.getStatus()).toBe(429);
    expect(error.getResponse()).toMatchObject({ details: { retryAfterSeconds: 900 } });
  });

  it('keeps an unexpired locked account when unique usernames flood capacity', async () => {
    process.env.OA_LOGIN_MAX_TRACKED_ACCOUNTS = '3';
    const limiter = createLimiter(repository);
    await limiter.reserve('locked-account');
    const lockingAttempt = await limiter.reserve('locked-account');
    await expectRateLimited(() => limiter.recordFailure(lockingAttempt));
    await limiter.reserve('flood-1');
    await limiter.reserve('flood-2');

    await expectRateLimited(() => limiter.reserve('flood-over-capacity'));
    await expectRateLimited(() => limiter.reserve('locked-account'));
  });

  it('reclaims only expired records when capacity is full', async () => {
    process.env.OA_LOGIN_MAX_TRACKED_ACCOUNTS = '1';
    let now = 1_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    const limiter = createLimiter(repository);
    await limiter.reserve('expired-account');

    now += 60_001;

    await expect(limiter.reserve('new-account')).resolves.toMatchObject({ attemptNumber: 1 });
    expect(await repository.find('expired-account')).toBeNull();
  });

  it('retains a locked account after the limiter and database connection restart', async () => {
    const database = await createTemporaryDatabase();
    const firstSource = await createDataSource(database);
    const firstLimiter = createLimiter(
      new LoginAttemptStateRepository(firstSource.getRepository(LoginAttemptStateEntity)),
    );
    await firstLimiter.reserve('restart-target');
    const lockingAttempt = await firstLimiter.reserve('restart-target');
    await expectRateLimited(() => firstLimiter.recordFailure(lockingAttempt));
    await firstSource.destroy();

    const restartedSource = await createDataSource(database);
    try {
      const restartedLimiter = createLimiter(
        new LoginAttemptStateRepository(restartedSource.getRepository(LoginAttemptStateEntity)),
      );
      await expectRateLimited(() => restartedLimiter.reserve('restart-target'));
    } finally {
      await restartedSource.destroy();
    }
  });

  it('persists successful-login cleanup across a restart', async () => {
    const database = await createTemporaryDatabase();
    const firstSource = await createDataSource(database);
    const firstLimiter = createLimiter(
      new LoginAttemptStateRepository(firstSource.getRepository(LoginAttemptStateEntity)),
    );
    await firstLimiter.reserve('successful-account');
    const successfulAttempt = await firstLimiter.reserve('successful-account');
    await firstLimiter.recordSuccess(successfulAttempt);
    await firstSource.destroy();

    const restartedSource = await createDataSource(database);
    try {
      const restartedLimiter = createLimiter(
        new LoginAttemptStateRepository(restartedSource.getRepository(LoginAttemptStateEntity)),
      );
      await expect(restartedLimiter.reserve('successful-account')).resolves.toMatchObject({
        attemptNumber: 1,
      });
    } finally {
      await restartedSource.destroy();
    }
  });

  async function createTemporaryDatabase(): Promise<string> {
    const root = await mkdtemp(join(tmpdir(), 'oa-login-attempt-test-'));
    temporaryRoots.push(root);
    return join(root, 'attempts.sqlite');
  }
});

function createLimiter(repository: LoginAttemptStateRepository): LoginAttemptLimiter {
  return new LoginAttemptLimiter(repository);
}

async function createDataSource(database: string): Promise<DataSource> {
  const source = new DataSource({
    type: 'better-sqlite3',
    database,
    entities: [LoginAttemptStateEntity],
    synchronize: true,
  });
  await source.initialize();
  return source;
}

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}

async function expectRateLimited(action: () => Promise<unknown>): Promise<void> {
  expect((await captureHttpException(action)).getStatus()).toBe(429);
}

async function captureHttpException(action: () => Promise<unknown>): Promise<HttpException> {
  let thrown: unknown;
  try {
    await action();
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(HttpException);
  return thrown as HttpException;
}
