import type { SessionUser } from '@oa/contracts';
import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSessionStore } from './session';

const user: SessionUser = {
  id: 'user-1',
  username: 'office',
  displayName: '办公室管理员',
  departmentId: 'department-office',
  departmentName: '办公室',
  roleCodes: ['OFFICE_MANAGER'],
  permissionCodes: ['IAM_VIEW', 'FORM_DESIGN_VIEW'],
  memberships: [],
  dataScopes: [],
  passwordChangeRequired: false,
};

describe('session permissions', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', { removeItem: vi.fn() });
    setActivePinia(createPinia());
  });

  afterEach(() => vi.unstubAllGlobals());

  it('checks permissions returned by the authenticated session', () => {
    const session = useSessionStore();
    session.user = user;

    expect(session.can('IAM_VIEW')).toBe(true);
    expect(session.can('PROCESS_DESIGN_VIEW')).toBe(false);
    expect(session.canAny(['PROCESS_DESIGN_VIEW', 'FORM_DESIGN_VIEW'])).toBe(true);
  });

  it('denies permissions when there is no authenticated session', () => {
    const session = useSessionStore();

    expect(session.can('IAM_VIEW')).toBe(false);
    expect(session.canAny(['IAM_VIEW', 'FORM_DESIGN_VIEW'])).toBe(false);
  });

  it('clears an in-flight session loading state when authentication expires', () => {
    const session = useSessionStore();
    session.user = user;
    session.loading = true;

    session.signOut();

    expect(session.user).toBeNull();
    expect(session.loading).toBe(false);
    expect(session.initialized).toBe(true);
  });

  it('replaces the forced-change session after a successful password update', async () => {
    const storage = memoryStorage();
    const updatedUser = { ...user, passwordChangeRequired: false };
    storage.setItem('oa-token', 'initial-token');
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ accessToken: 'refreshed-token', user: updatedUser }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    );
    const session = useSessionStore();
    session.user = { ...user, passwordChangeRequired: true };

    await session.changePassword('000000', 'Hotel2026');

    expect(session.user).toEqual(updatedUser);
    expect(session.changingPassword).toBe(false);
    expect(storage.getItem('oa-token')).toBe('refreshed-token');
  });

  it('keeps a valid token and allows retry after a temporary session failure', async () => {
    const storage = memoryStorage();
    storage.setItem('oa-token', 'valid-token');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: '服务暂时不可用' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(user), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('fetch', fetchMock);
    const session = useSessionStore();

    await expect(session.ensureSession()).rejects.toMatchObject({ status: 503 });
    expect(storage.getItem('oa-token')).toBe('valid-token');
    expect(session.loading).toBe(false);
    expect(session.initialized).toBe(false);

    await session.ensureSession();
    expect(session.user).toEqual(user);
    expect(session.initialized).toBe(true);
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
