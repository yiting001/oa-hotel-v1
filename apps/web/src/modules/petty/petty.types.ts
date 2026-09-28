export interface PettyMaterial {
  id: string;
  name: string;
  brand: string;
  unit: string;
  unitPriceCents: number;
  supplierName: string;
  supplierContact: string | null;
  supplierPhone: string | null;
  active: boolean;
}

export type PettyMaterialPayload = Omit<PettyMaterial, 'id'>;

export interface PettyItem {
  id: string;
  procurementId: string;
  materialId: string;
  name: string;
  brand: string;
  unit: string;
  unitPriceCents: number;
  quantity: number;
  subtotalCents: number;
  /** 线下请购单的「要求」。 */
  requirement: string;
  /** 线下请购单的「备注」。 */
  remark: string;
}

export interface PettyChangeLog {
  id: string;
  procurementId: string;
  actorId: string;
  actorName: string;
  action: string;
  detail: string;
  createdAt: string;
}

export interface PettyProcurementData {
  id: string;
  number: string;
  title: string;
  totalAmountCents: number;
  remark: string | null;
  /** 餐饮食品原材料请购单的「班组」。 */
  teamName: string;
  /** 线下请购单的日期。 */
  applicationDate: string;
  applicantId: string;
  departmentId: string;
  attachments: string[];
  items: PettyItem[];
  changeLogs: PettyChangeLog[];
  canModerate: boolean;
}

export interface PettyItemDraft {
  materialId: string | null;
  quantity: number;
  requirement: string;
  remark: string;
}

export interface PettyProcurementPayload {
  title: string;
  remark: string | null;
  teamName: string;
  applicationDate: string;
  items: Array<{ materialId: string; quantity: number; requirement: string; remark: string }>;
  attachments: string[];
}
