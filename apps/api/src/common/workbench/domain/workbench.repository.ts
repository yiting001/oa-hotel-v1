import type { WorkbenchBox, WorkbenchItem } from '@oa/contracts';
import type { WorkbenchQuery, WorkbenchRepositoryContext } from './workbench.types';

export const WORKBENCH_REPOSITORY = Symbol('WORKBENCH_REPOSITORY');

export interface WorkbenchRepositoryPage {
  total: number;
  items: WorkbenchItem[];
}

/** Query-only boundary over workflow, document and organization read tables. */
export interface WorkbenchRepository {
  count(box: WorkbenchBox, context: WorkbenchRepositoryContext): Promise<number>;
  findPage(
    query: WorkbenchQuery,
    context: WorkbenchRepositoryContext,
  ): Promise<WorkbenchRepositoryPage>;
}
