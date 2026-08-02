import type { PortalContentCategory } from '@oa/contracts';

export const portalViewPermissions = ['PORTAL_VIEW', 'CONTENT_VIEW'] as const;

export const portalCategoryLabels: Record<PortalContentCategory, string> = {
  COMPANY_NEWS: '公司新闻',
  NOTICE: '通知公告',
  MEETING_MINUTES: '会议纪要',
  MEMO: '备忘录',
  POLICY: '规章制度',
  PARTY_WORK: '党群工作',
  EVENT: '宴会会议',
};

export const portalContentManagePermission = 'CONTENT_MANAGE';
