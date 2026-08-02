import { apiRequest } from '../../../shared/api';
import type {
  FormDefinition,
  FormVersion,
  PrintSchema,
  ProcessDefinition,
  ProcessDesign,
  ProcessVersion,
} from '../types/designer';

function definitionApi<TDefinition, TVersion>(collection: '/forms' | '/processes') {
  return {
    list(): Promise<TDefinition[]> {
      return apiRequest<TDefinition[]>(collection);
    },
    get(id: string): Promise<TDefinition> {
      return apiRequest<TDefinition>(`${collection}/${id}`);
    },
    copyVersion(definitionId: string, sourceVersionId?: string): Promise<TVersion> {
      return apiRequest<TVersion>(`${collection}/${definitionId}/versions`, {
        method: 'POST',
        body: { sourceVersionId, changeNote: '复制为新草稿版本' },
      });
    },
    publish(versionId: string): Promise<TVersion> {
      return apiRequest<TVersion>(`${collection}/versions/${versionId}/publish`, {
        method: 'POST',
      });
    },
  };
}

const processBase = definitionApi<ProcessDefinition, ProcessVersion>('/processes');
const formBase = definitionApi<FormDefinition, FormVersion>('/forms');

export const processApi = {
  ...processBase,
  create(input: {
    code: string;
    name: string;
    documentType?: string;
    description?: string;
    designJson: ProcessDesign;
    changeNote?: string;
  }): Promise<ProcessDefinition> {
    return apiRequest<ProcessDefinition>('/processes', { method: 'POST', body: input });
  },
  updateVersion(
    versionId: string,
    input: { designJson: ProcessDesign; changeNote?: string },
  ): Promise<ProcessVersion> {
    return apiRequest<ProcessVersion>(`/processes/versions/${versionId}`, {
      method: 'PATCH',
      body: input,
    });
  },
};

export const formApi = {
  ...formBase,
  create(input: {
    code: string;
    name: string;
    documentType?: string;
    description?: string;
    schemaJson: Record<string, unknown>;
    printSchemaJson: PrintSchema;
    changeNote?: string;
  }): Promise<FormDefinition> {
    return apiRequest<FormDefinition>('/forms', { method: 'POST', body: input });
  },
  updateVersion(
    versionId: string,
    input: {
      schemaJson: Record<string, unknown>;
      printSchemaJson: PrintSchema;
      changeNote?: string;
    },
  ): Promise<FormVersion> {
    return apiRequest<FormVersion>(`/forms/versions/${versionId}`, {
      method: 'PATCH',
      body: input,
    });
  },
};
