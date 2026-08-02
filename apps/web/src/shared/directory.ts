import type { DirectoryUser } from '@oa/contracts';
import { defineStore } from 'pinia';
import { apiRequest, getAuthGeneration } from './api';

export interface DepartmentOption {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
}

export const useDirectoryStore = defineStore('directory', {
  state: () => ({
    users: [] as DirectoryUser[],
    departments: [] as DepartmentOption[],
    loading: false,
    loaded: false,
  }),
  actions: {
    async load(): Promise<void> {
      if (this.loaded || this.loading) {
        return;
      }
      const generation = getAuthGeneration();
      this.loading = true;
      try {
        const [users, departments] = await Promise.all([
          apiRequest<DirectoryUser[]>('/auth/users'),
          apiRequest<DepartmentOption[]>('/auth/departments'),
        ]);
        if (generation === getAuthGeneration()) {
          this.users = users;
          this.departments = departments;
          this.loaded = true;
        }
      } finally {
        if (generation === getAuthGeneration()) this.loading = false;
      }
    },
  },
});
