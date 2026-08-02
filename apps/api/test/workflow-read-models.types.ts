export interface LoginResponse {
  accessToken: string;
}

export interface Envelope<T> {
  data: T;
}

export interface CreatedDocument {
  id: string;
}

export interface Task {
  id: string;
  documentId: string;
  documentType: string;
  documentTitle: string;
  currentStep: number;
  processNodeId: string | null;
  processNodeName: string | null;
  assigneeRole: string;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowOverviewResponse {
  document: {
    id: string;
    documentType: string;
    module: string;
    title: string;
    status: string;
    currentStep: number | null;
    workflowCode: string;
    processVersionId: string | null;
    formVersionId: string | null;
  };
  definition: {
    code: string;
    name: string;
    version: number;
    processVersionId: string | null;
    steps: string[];
  };
  currentTask: Task | null;
  opinions: Array<{
    action: string;
    comment: string;
    actorName: string;
    actorDepartmentName: string | null;
    processNodeName: string | null;
    createdAt: string;
  }>;
}
