import type { SessionUser } from '@oa/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  apiRequest,
  changePassword,
  getToken,
  requestId,
  setToken,
  unauthorizedEventName,
} from './api';

describe('requestId', () => {
  it('generates an idempotency key', () => {
    expect(requestId()).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('unauthorized requests', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('clears the token and notifies the application for non-login requests', async () => {
    const storage = memoryStorage();
    const browserWindow = new EventTarget();
    let eventCount = 0;
    browserWindow.addEventListener(unauthorizedEventName, () => eventCount++);
    storage.setItem('oa-token', 'expired-token');
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', browserWindow);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: 'AUTH_EXPIRED', message: '会话已过期' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(apiRequest('/workbench/summary')).rejects.toMatchObject({ status: 401 });
    expect(storage.getItem('oa-token')).toBeNull();
    expect(eventCount).toBe(1);
  });

  it('does not emit a global expiry event for invalid login credentials', async () => {
    const storage = memoryStorage();
    const browserWindow = new EventTarget();
    let eventCount = 0;
    browserWindow.addEventListener(unauthorizedEventName, () => eventCount++);
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', browserWindow);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: 'LOGIN_FAILED', message: '账号或密码错误' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );

    await expect(apiRequest('/auth/login')).rejects.toMatchObject({ status: 401 });
    expect(eventCount).toBe(0);
  });

  it('does not let an old 401 response clear a newer account token', async () => {
    const storage = memoryStorage();
    const browserWindow = new EventTarget();
    const response = deferred<Response>();
    let eventCount = 0;
    browserWindow.addEventListener(unauthorizedEventName, () => eventCount++);
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', browserWindow);
    vi.stubGlobal('fetch', vi.fn().mockReturnValue(response.promise));
    setToken('account-a-token');

    const oldRequest = apiRequest('/workbench/summary');
    setToken('account-b-token');
    response.resolve(
      new Response(JSON.stringify({ code: 'AUTH_EXPIRED', message: '会话已过期' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(oldRequest).rejects.toMatchObject({ status: 401 });
    expect(getToken()).toBe('account-b-token');
    expect(eventCount).toBe(0);
  });
});

describe('password change', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends the current credentials and installs the refreshed session token', async () => {
    const storage = memoryStorage();
    const user: SessionUser = {
      id: 'user-1',
      username: '张三',
      displayName: '张三',
      departmentId: 'department-office',
      departmentName: '办公室',
      roleCodes: ['EMPLOYEE'],
      permissionCodes: [],
      memberships: [],
      dataScopes: [],
      passwordChangeRequired: false,
    };
    storage.setItem('oa-token', 'initial-token');
    vi.stubGlobal('localStorage', storage);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ accessToken: 'refreshed-token', user }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(changePassword('000000', 'Hotel2026')).resolves.toEqual(user);

    expect(getToken()).toBe('refreshed-token');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/v1/auth/me/password');
    expect(init.method).toBe('PUT');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer initial-token');
    expect(JSON.parse(String(init.body))).toEqual({
      currentPassword: '000000',
      newPassword: 'Hotel2026',
    });
  });
});

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}
