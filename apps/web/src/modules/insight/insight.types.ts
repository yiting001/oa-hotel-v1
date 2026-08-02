export interface DocumentSearchRow {
  id: string;
  documentType: string;
  documentNo: string | null;
  title: string;
  status: string;
  applicantId: string;
  applicantName: string;
  amountCents: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface OperationLogRow {
  id: string;
  documentId: string;
  documentNo: string | null;
  documentTitle: string;
  actorName: string;
  action: string;
  comment: string;
  createdAt: string;
}

export interface StatisticsBucket {
  period: string;
  documentType: string;
  count: number;
  amountCents: number;
}
