import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import type { Repository } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ApiExceptionFilter } from '../errors/api-exception.filter';
import { UserEntity } from './user.entity';

const originalLoginMaxFailures = process.env.OA_LOGIN_MAX_FAILURES;
const originalLoginLockMs = process.env.OA_LOGIN_LOCK_MS;

describe('credential lifecycle HTTP API', () => {
  let app: INestApplication;
  let server: Parameters<typeof request>[0];
  let users: Repository<UserEntity>;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.OA_DATABASE_PATH = ':memory:';
    process.env.JWT_SECRET = 'credential-lifecycle-test-secret';
    process.env.OA_DEMO_PASSWORD = '000000';
    process.env.OA_LOGIN_MAX_FAILURES = '2';
    process.env.OA_LOGIN_LOCK_MS = '60000';
    delete process.env.OA_BOOTSTRAP_ADMIN_USERNAME;

    const { AppModule } = await import('../../app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
    server = app.getHttpServer() as Parameters<typeof request>[0];
    users = moduleRef.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
  });

  afterAll(async () => {
    await app?.close();
    restoreEnvironment('OA_LOGIN_MAX_FAILURES', originalLoginMaxFailures);
    restoreEnvironment('OA_LOGIN_LOCK_MS', originalLoginLockMs);
  });

  it('accepts an existing six-character initial password at login', async () => {
    const response = await request(server)
      .post('/api/v1/auth/login')
      .send({ username: 'applicant', password: '000000' })
      .expect(201);

    expect(response.body).toMatchObject({
      accessToken: expect.any(String),
      user: { username: 'applicant' },
    });
  });

  it('normalizes surrounding whitespace in the login username', async () => {
    const response = await request(server)
      .post('/api/v1/auth/login')
      .send({ username: '  applicant  ', password: '000000' })
      .expect(201);

    expect(response.body.user.username).toBe('applicant');
  });

  it('changes the current user password and returns a replacement session', async () => {
    const loginResponse = await request(server)
      .post('/api/v1/auth/login')
      .send({ username: 'manager', password: '000000' })
      .expect(201);

    const response = await request(server)
      .put('/api/v1/auth/me/password')
      .auth(loginResponse.body.accessToken as string, { type: 'bearer' })
      .send({ currentPassword: '000000', newPassword: 'ManagerPassword1!' })
      .expect(200);

    expect(response.body).toMatchObject({
      accessToken: expect.any(String),
      user: {
        username: 'manager',
        passwordChangeRequired: false,
      },
    });
  });

  it('blocks normal APIs until an initial password has been changed', async () => {
    await users.update({ username: 'office' }, { passwordChangeRequired: true });
    const loginResponse = await request(server)
      .post('/api/v1/auth/login')
      .send({ username: 'office', password: '000000' })
      .expect(201);

    expect(loginResponse.body.user.passwordChangeRequired).toBe(true);
    const response = await request(server)
      .get('/api/v1/auth/departments')
      .auth(loginResponse.body.accessToken as string, { type: 'bearer' })
      .expect(403);

    expect(response.body).toMatchObject({ code: 'PASSWORD_CHANGE_REQUIRED' });
  });

  it('invalidates the old token and accepts the replacement token after a password change', async () => {
    const loginResponse = await request(server)
      .post('/api/v1/auth/login')
      .send({ username: 'procurement', password: '000000' })
      .expect(201);
    const oldToken = loginResponse.body.accessToken as string;
    const changeResponse = await request(server)
      .put('/api/v1/auth/me/password')
      .auth(oldToken, { type: 'bearer' })
      .send({ currentPassword: '000000', newPassword: 'ProcurementPassword1!' })
      .expect(200);

    await request(server).get('/api/v1/auth/me').auth(oldToken, { type: 'bearer' }).expect(401);
    await request(server)
      .get('/api/v1/auth/me')
      .auth(changeResponse.body.accessToken as string, { type: 'bearer' })
      .expect(200);
  });

  it('rejects a new password made only of whitespace', async () => {
    const loginResponse = await request(server)
      .post('/api/v1/auth/login')
      .send({ username: 'warehouse', password: '000000' })
      .expect(201);

    await request(server)
      .put('/api/v1/auth/me/password')
      .auth(loginResponse.body.accessToken as string, { type: 'bearer' })
      .send({ currentPassword: '000000', newPassword: '        ' })
      .expect(400);
  });

  it('rejects a new password shorter than eight characters', async () => {
    const loginResponse = await request(server)
      .post('/api/v1/auth/login')
      .send({ username: 'office', password: '000000' })
      .expect(201);

    await request(server)
      .put('/api/v1/auth/me/password')
      .auth(loginResponse.body.accessToken as string, { type: 'bearer' })
      .send({ currentPassword: '000000', newPassword: 'short7' })
      .expect(400);
  });

  it('returns a business validation error when the current password is wrong', async () => {
    const loginResponse = await request(server)
      .post('/api/v1/auth/login')
      .send({ username: 'finance', password: '000000' })
      .expect(201);

    const response = await request(server)
      .put('/api/v1/auth/me/password')
      .auth(loginResponse.body.accessToken as string, { type: 'bearer' })
      .send({ currentPassword: 'wrong-password', newPassword: 'FinancePassword1!' })
      .expect(400);

    expect(response.body.code).toBe('CURRENT_PASSWORD_INVALID');
    await request(server)
      .get('/api/v1/auth/me')
      .auth(loginResponse.body.accessToken as string, { type: 'bearer' })
      .expect(200);
  });

  it('rejects reusing the current password', async () => {
    const loginResponse = await request(server)
      .post('/api/v1/auth/login')
      .send({ username: 'applicant', password: '000000' })
      .expect(201);

    const response = await request(server)
      .put('/api/v1/auth/me/password')
      .auth(loginResponse.body.accessToken as string, { type: 'bearer' })
      .send({ currentPassword: '000000', newPassword: '000000' })
      .expect(400);

    expect(response.body.code).toBe('NEW_PASSWORD_MUST_DIFFER');
  });

  it('allows profile access and password recovery while the initial-password lock is active', async () => {
    const loginResponse = await request(server)
      .post('/api/v1/auth/login')
      .send({ username: 'office', password: '000000' })
      .expect(201);
    const token = loginResponse.body.accessToken as string;

    const profileResponse = await request(server)
      .get('/api/v1/auth/me')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(profileResponse.body.passwordChangeRequired).toBe(true);

    const changeResponse = await request(server)
      .put('/api/v1/auth/me/password')
      .auth(token, { type: 'bearer' })
      .send({ currentPassword: '000000', newPassword: 'OfficePassword1!' })
      .expect(200);
    expect(changeResponse.body.user.passwordChangeRequired).toBe(false);

    await request(server)
      .get('/api/v1/auth/departments')
      .auth(changeResponse.body.accessToken as string, { type: 'bearer' })
      .expect(200);
  });

  it('uses only the new password for subsequent logins', async () => {
    await request(server)
      .post('/api/v1/auth/login')
      .send({ username: 'manager', password: '000000' })
      .expect(401);

    const response = await request(server)
      .post('/api/v1/auth/login')
      .send({ username: 'manager', password: 'ManagerPassword1!' })
      .expect(201);
    expect(response.body.user.username).toBe('manager');
  });

  it('rate limits an account when failed logins reach the configured threshold', async () => {
    const credentials = { username: 'brute-force-target', password: 'wrong-password' };
    await request(server).post('/api/v1/auth/login').send(credentials).expect(401);

    const response = await request(server).post('/api/v1/auth/login').send(credentials).expect(429);
    expect(response.body).toMatchObject({
      code: 'LOGIN_RATE_LIMITED',
      details: { retryAfterSeconds: expect.any(Number) },
    });
    expect(response.body.details.retryAfterSeconds).toBeGreaterThan(0);
    expect(response.body.details.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it('clears failed-attempt state after a successful login', async () => {
    const wrongCredentials = { username: 'warehouse', password: 'wrong-password' };
    const firstFailure = await request(server)
      .post('/api/v1/auth/login')
      .send(wrongCredentials)
      .expect(401);
    expect(firstFailure.body.message).toBe('账号或密码错误');

    await request(server)
      .post('/api/v1/auth/login')
      .send({ username: 'warehouse', password: '000000' })
      .expect(201);

    await request(server).post('/api/v1/auth/login').send(wrongCredentials).expect(401);
    await request(server).post('/api/v1/auth/login').send(wrongCredentials).expect(429);
  });

  it('reserves limiter capacity before concurrent password verification starts', async () => {
    const responses = await Promise.all(
      Array.from({ length: 4 }, () =>
        request(server)
          .post('/api/v1/auth/login')
          .send({ username: 'applicant', password: 'wrong-password' }),
      ),
    );

    expect(responses.filter((response) => response.status === 401)).toHaveLength(1);
    expect(responses.filter((response) => response.status === 429)).toHaveLength(3);
  });
});

function restoreEnvironment(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
}
