import type { SessionUser } from '@oa/contracts';
import { defineStore } from 'pinia';
import { apiRequest, getToken, login } from './api';

export const useSessionStore = defineStore('session', {
  state: () => ({
    user: null as SessionUser | null,
  }),
  actions: {
    async ensureSession() {
      if (!getToken()) {
        this.user = await login('applicant', 'Demo123!');
        return;
      }
      this.user = await apiRequest<SessionUser>('/auth/me');
    },
    async switchUser(username: string) {
      this.user = await login(username, 'Demo123!');
    },
  },
});
