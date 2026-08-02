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

export interface RequestLogRow {
  id: string;
  traceId: string;
  method: string;
  path: string;
  query: string | null;
  statusCode: number;
  durationMs: number;
  actorId: string | null;
  actorName: string | null;
  requestBody: string | null;
  responseBody: string | null;
  errorMessage: string | null;
  errorStack: string | null;
  createdAt: string;
}

export interface StatisticsBucket {
  period: string;
  documentType: string;
  count: number;
  amountCents: number;
}
