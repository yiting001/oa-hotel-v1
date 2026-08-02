export type DocumentStatus = 'DRAFT' | 'IN_REVIEW' | 'RETURNED' | 'APPROVED' | 'CANCELLED';

export type DataScope = 'SELF' | 'DEPARTMENT' | 'DEPARTMENT_TREE' | 'ALL';

export type BusinessModule = 'CONTRACT' | 'SEAL' | 'SUPPLY';

export type DocumentType =
  | 'CONTRACT_REQUEST'
  | 'CONTRACT_APPROVAL'
  | 'CONTRACT_PAYMENT'
  | 'SEAL_BORROW'
  | 'SEAL_USE'
  | 'MATERIAL_PURCHASE'
  | 'MATERIAL_REQUISITION';

export type BusinessPermissionAction = 'CREATE' | 'VIEW';

export type PortalAudienceType = 'ALL' | 'DEPARTMENT' | 'ROLE' | 'USER';

export const PORTAL_CONTENT_CATEGORIES = [
  'MEETING_MINUTES',
  'MEMO',
  'NOTICE',
  'POLICY',
  'COMPANY_NEWS',
  'PARTY_WORK',
  'EVENT',
] as const;

export type PortalContentCategory = (typeof PORTAL_CONTENT_CATEGORIES)[number];
