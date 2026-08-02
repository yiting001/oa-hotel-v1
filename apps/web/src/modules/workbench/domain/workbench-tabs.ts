import type { PortalReadingStatus, WorkbenchBox } from '@oa/contracts';

export const WORKBENCH_TAB_NAMES = [
  'pending',
  'completed',
  'mine',
  'drafts',
  'following',
  'copied',
  'unread',
  'read',
] as const;

export type WorkbenchTab = (typeof WORKBENCH_TAB_NAMES)[number];

export const boxByWorkbenchTab: Partial<Record<WorkbenchTab, WorkbenchBox>> = {
  pending: 'PENDING',
  completed: 'COMPLETED',
  mine: 'MINE',
  drafts: 'DRAFTS',
  following: 'FOLLOWING',
  copied: 'COPIED',
};

export const readingStatusByWorkbenchTab: Partial<Record<WorkbenchTab, PortalReadingStatus>> = {
  unread: 'UNREAD',
  read: 'READ',
};

export function resolveWorkbenchTab(
  value: unknown,
  canReadContent: boolean,
  canFollowDocuments: boolean,
): WorkbenchTab {
  const tab = String(value);
  if (!WORKBENCH_TAB_NAMES.some((name) => name === tab)) return 'pending';
  if ((tab === 'unread' || tab === 'read') && !canReadContent) return 'pending';
  if (tab === 'following' && !canFollowDocuments) return 'pending';
  return tab as WorkbenchTab;
}
