import type { DocumentAttachmentItem } from '@oa/contracts';

/** 食材采购明细：品类 / 品名 / 规格 / 数量 / 单位 / 要求 / 单价 / 总价 / 备注。 */
export interface FoodPurchaseItem {
  id: string;
  purchaseId: string;
  sortOrder: number;
  category: string;
  name: string;
  specification: string;
  unit: string;
  quantity: number;
  requirement: string;
  unitPriceCents: number | null;
  subtotalCents: number;
  remark: string;
}

export type FoodPurchaseItemDraft = Omit<
  FoodPurchaseItem,
  'id' | 'purchaseId' | 'sortOrder' | 'subtotalCents'
>;

export interface FoodPurchaseChangeLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  detail: string;
  createdAt: string;
}

export interface FoodPurchaseData {
  id: string;
  number: string;
  applicantId: string;
  departmentId: string;
  applicationDate: string;
  /** 班组：对应线下请购单表头。 */
  teamName: string;
  totalAmountCents: number;
  items: FoodPurchaseItem[];
  /** 上传附件（带 id 可下载）与历史文件名混排。 */
  attachments: DocumentAttachmentItem[];
  changeLogs: FoodPurchaseChangeLog[];
  /** 当前用户是否为在办审批人，可删减调整明细。 */
  canModerate: boolean;
}

/** 总价由服务端按明细汇总，前端不提交。 */
export type FoodPurchasePayload = Omit<
  FoodPurchaseData,
  | 'id'
  | 'number'
  | 'applicantId'
  | 'departmentId'
  | 'totalAmountCents'
  | 'items'
  | 'changeLogs'
  | 'canModerate'
> & {
  items: FoodPurchaseItemDraft[];
};
