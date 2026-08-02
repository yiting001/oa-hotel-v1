import type {
  PortalContentDetail,
  PortalContentSummary,
  PortalHomeResponse,
  PortalReadingResponse,
  PortalReadingStatus,
} from '@oa/contracts';
import { defineStore } from 'pinia';
import { getAuthGeneration } from '../../../shared/api';
import {
  loadPortalContent,
  loadPortalHome,
  loadPortalReading,
  markPortalContentRead,
} from '../api/portal-api';

type ReadingStateMap<T> = Record<PortalReadingStatus, T>;

function emptyReadingPage(status: PortalReadingStatus): PortalReadingResponse {
  return { status, page: 1, pageSize: 20, total: 0, items: [] };
}

export const usePortalStore = defineStore('portal', {
  state: () => ({
    home: null as PortalHomeResponse | null,
    readingPages: {
      ALL: emptyReadingPage('ALL'),
      UNREAD: emptyReadingPage('UNREAD'),
      READ: emptyReadingPage('READ'),
    } as ReadingStateMap<PortalReadingResponse>,
    loading: false,
    readingLoadingByStatus: { ALL: false, UNREAD: false, READ: false } as ReadingStateMap<boolean>,
    readingRequestSequence: { ALL: 0, UNREAD: 0, READ: 0 } as ReadingStateMap<number>,
    readingMutationVersion: 0,
    homeRequestSequence: 0,
  }),
  getters: {
    unreadCount: (state) =>
      state.home?.sections.reduce((total, section) => total + section.unreadCount, 0) ?? 0,
    readingLoading: (state) => Object.values(state.readingLoadingByStatus).some(Boolean),
    readings: (state) => ({
      ALL: state.readingPages.ALL.items,
      UNREAD: state.readingPages.UNREAD.items,
      READ: state.readingPages.READ.items,
    }),
    readingTotal: (state) => (status: PortalReadingStatus) => state.readingPages[status].total,
  },
  actions: {
    async refreshHome(): Promise<void> {
      const generation = getAuthGeneration();
      const sequence = ++this.homeRequestSequence;
      const mutationVersion = this.readingMutationVersion;
      this.loading = true;
      try {
        const home = await loadPortalHome();
        if (
          sequence === this.homeRequestSequence &&
          generation === getAuthGeneration() &&
          mutationVersion === this.readingMutationVersion
        ) {
          this.home = home;
        }
      } finally {
        if (generation === getAuthGeneration() && sequence === this.homeRequestSequence) {
          this.loading = false;
        }
      }
    },
    async refreshReading(status: PortalReadingStatus, page = 1, pageSize = 20): Promise<void> {
      const generation = getAuthGeneration();
      const sequence = ++this.readingRequestSequence[status];
      const mutationVersion = this.readingMutationVersion;
      this.readingLoadingByStatus[status] = true;
      try {
        const result = await loadPortalReading(status, page, pageSize);
        if (
          sequence === this.readingRequestSequence[status] &&
          generation === getAuthGeneration() &&
          mutationVersion === this.readingMutationVersion
        ) {
          this.readingPages[status] = result;
        }
      } finally {
        if (
          generation === getAuthGeneration() &&
          sequence === this.readingRequestSequence[status]
        ) {
          this.readingLoadingByStatus[status] = false;
        }
      }
    },
    async getContent(contentId: string): Promise<PortalContentDetail> {
      return loadPortalContent(contentId);
    },
    async markRead(item: PortalContentSummary): Promise<boolean> {
      const generation = getAuthGeneration();
      await markPortalContentRead(item.id);
      if (generation !== getAuthGeneration()) return true;
      this.readingMutationVersion += 1;
      this.applyHomeReadState(item);
      try {
        await Promise.all([this.refreshReceiptPage('UNREAD'), this.refreshReceiptPage('READ')]);
        return true;
      } catch {
        return false;
      }
    },
    applyHomeReadState(item: PortalContentSummary): void {
      if (this.home) {
        this.home = {
          ...this.home,
          sections: this.home.sections.map((section) => ({
            ...section,
            unreadCount:
              section.key === item.category && !item.read
                ? Math.max(0, section.unreadCount - 1)
                : section.unreadCount,
            items: section.items.map((sectionItem) =>
              sectionItem.id === item.id ? { ...sectionItem, read: true } : sectionItem,
            ),
          })),
        };
      }
    },
    async refreshReceiptPage(status: 'UNREAD' | 'READ'): Promise<void> {
      const current = this.readingPages[status];
      await this.refreshReading(status, current.page, current.pageSize);
      const refreshed = this.readingPages[status];
      const lastPage = Math.max(1, Math.ceil(refreshed.total / refreshed.pageSize));
      if (refreshed.page > lastPage) {
        await this.refreshReading(status, lastPage, refreshed.pageSize);
      }
    },
  },
});
