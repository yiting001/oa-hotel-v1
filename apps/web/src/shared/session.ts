import type { SessionUser } from '@oa/contracts';
import { defineStore } from 'pinia';
import {
  ApiRequestError,
  apiRequest,
  changePassword as updateOwnPassword,
  clearToken,
  getAuthGeneration,
  getToken,
  login,
} from './api';

export const useSessionStore = defineStore('session', {
  state: () => ({
    user: null as SessionUser | null,
    initialized: false,
    loading: false,
    changingPassword: false,
  }),
  getters: {
    authenticated: (state) => state.user !== null,
    can: (state) => (permissionCode: string) =>
      (state.user?.permissionCodes ?? []).includes(permissionCode),
    canAny: (state) => (permissionCodes: readonly string[]) => {
      const grantedPermissions = new Set(state.user?.permissionCodes ?? []);
      return permissionCodes.some((permissionCode) => grantedPermissions.has(permissionCode));
    },
  },
  actions: {
    async ensureSession(): Promise<void> {
      if (this.initialized) {
        return;
      }
      if (!getToken()) {
        this.initialized = true;
        return;
      }
      const generation = getAuthGeneration();
      this.loading = true;
      try {
        const user = await apiRequest<SessionUser>('/auth/me');
        if (generation !== getAuthGeneration()) return;
        this.user = user;
        this.loading = false;
        this.initialized = true;
      } catch (error) {
        if (generation !== getAuthGeneration()) return;
        this.loading = false;
        if (error instanceof ApiRequestError && error.status === 401) {
          clearToken();
          this.user = null;
          this.initialized = true;
          return;
        }
        this.initialized = false;
        throw error;
      }
    },
    async signIn(username: string, password: string): Promise<void> {
      this.loading = true;
      try {
        this.user = await login(username, password);
        this.initialized = true;
      } finally {
        this.loading = false;
      }
    },
    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
      this.changingPassword = true;
      try {
        this.user = await updateOwnPassword(currentPassword, newPassword);
        this.initialized = true;
      } finally {
        this.changingPassword = false;
      }
    },
    signOut(): void {
      clearToken();
      this.user = null;
      this.loading = false;
      this.changingPassword = false;
      this.initialized = true;
    },
  },
});
