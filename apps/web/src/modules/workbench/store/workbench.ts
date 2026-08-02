import {
  WORKBENCH_BOXES,
  type WorkbenchBox,
  type WorkbenchPage,
  type WorkbenchSummary,
} from '@oa/contracts';
import { defineStore } from 'pinia';
import { getAuthGeneration } from '../../../shared/api';
import {
  loadWorkbenchItems,
  loadWorkbenchSummary,
  markWorkflowCopyRead,
} from '../api/workbench-api';
import type { WorkbenchItemsRequest } from '../domain/workbench';

type PageMap = Record<WorkbenchBox, WorkbenchPage>;
type BoxState<T> = Record<WorkbenchBox, T>;

function boxState<T>(factory: (box: WorkbenchBox) => T): BoxState<T> {
  return Object.fromEntries(WORKBENCH_BOXES.map((box) => [box, factory(box)])) as BoxState<T>;
}

function emptyPage(box: WorkbenchBox): WorkbenchPage {
  return { box, page: 1, pageSize: 20, total: 0, items: [] };
}

export const usePersonalWorkbenchStore = defineStore('personal-workbench', {
  state: () => ({
    summary: null as WorkbenchSummary | null,
    pages: boxState(emptyPage) as PageMap,
    summaryLoading: false,
    summaryRequestSequence: 0,
    pageLoading: boxState(() => false),
    requestSequence: boxState(() => 0),
  }),
  getters: {
    count: (state) => (box: WorkbenchBox) => state.summary?.counts[box] ?? 0,
  },
  actions: {
    async refreshSummary(): Promise<void> {
      const generation = getAuthGeneration();
      const sequence = ++this.summaryRequestSequence;
      this.summaryLoading = true;
      try {
        const summary = await loadWorkbenchSummary();
        if (generation === getAuthGeneration() && sequence === this.summaryRequestSequence) {
          this.summary = summary;
        }
      } finally {
        if (generation === getAuthGeneration() && sequence === this.summaryRequestSequence) {
          this.summaryLoading = false;
        }
      }
    },
    async loadPage(input: WorkbenchItemsRequest): Promise<void> {
      const generation = getAuthGeneration();
      const sequence = ++this.requestSequence[input.box];
      this.pageLoading[input.box] = true;
      try {
        const page = await loadWorkbenchItems(input);
        if (generation === getAuthGeneration() && sequence === this.requestSequence[input.box]) {
          this.pages[input.box] = page;
        }
      } finally {
        if (generation === getAuthGeneration() && sequence === this.requestSequence[input.box]) {
          this.pageLoading[input.box] = false;
        }
      }
    },
    async markCopyRead(copyId: string): Promise<void> {
      const delivery = await markWorkflowCopyRead(copyId);
      this.pages.COPIED.items = this.pages.COPIED.items.map((item) =>
        item.copyId === copyId ? { ...item, copyReadAt: delivery.readAt } : item,
      );
    },
  },
});
