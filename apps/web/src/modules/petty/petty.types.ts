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
}

export interface PettyProcurementPayload {
  title: string;
  remark: string | null;
  items: Array<{ materialId: string; quantity: number }>;
  attachments: string[];
}
