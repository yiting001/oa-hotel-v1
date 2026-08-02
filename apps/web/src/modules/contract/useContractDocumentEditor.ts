import type { DocumentStatus, DocumentType, WorkflowOverview } from '@oa/contracts';
import { message } from 'ant-design-vue';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { apiRequest, type ApiEnvelope, requestId } from '../../shared/api';
import { documentDetailPath } from '../../shared/document';
import { useWorkflowStore } from '../../shared/workflow';
import { CONTRACT_API, EDITABLE_DOCUMENT_STATUSES } from './contract.config';
import type { EditorMode } from './contract.types';

interface DocumentEntity {
  id: string;
  number: string;
}

interface EditorOptions<TEntity extends DocumentEntity, TPayload extends object> {
  mode: EditorMode;
  documentId?: string;
  documentType: DocumentType;
  createPath: string;
  itemPath: (id: string) => string;
  editRouteName: string;
  listRouteName?: string;
  validate: () => Promise<void>;
  payload: () => TPayload;
  assign: (entity: TEntity) => void;
}

export function useContractDocumentEditor<TEntity extends DocumentEntity, TPayload extends object>(
  options: EditorOptions<TEntity, TPayload>,
) {
  const router = useRouter();
  const workflow = useWorkflowStore();
  const entityId = ref<string | null>(
    options.mode === 'edit' ? (options.documentId ?? null) : null,
  );
  const documentNumber = ref<string | null>(null);
  const status = ref<DocumentStatus | null>(null);
  const revision = ref<number | null>(null);
  const overview = ref<WorkflowOverview | null>(null);
  const loading = ref(false);
  const saving = ref(false);
  const submitting = ref(false);

  const editable = computed(
    () => status.value === null || EDITABLE_DOCUMENT_STATUSES.includes(status.value),
  );
  const busy = computed(() => loading.value || saving.value || submitting.value);

  async function initialize(prerequisites: Promise<unknown>[] = []): Promise<void> {
    loading.value = true;
    try {
      await Promise.all(prerequisites);
      if (!entityId.value) {
        return;
      }
      const [envelope, workflowOverview] = await Promise.all([
        apiRequest<ApiEnvelope<TEntity>>(options.itemPath(entityId.value)),
        workflow.loadOverview(entityId.value),
      ]);
      options.assign(envelope.data);
      applyEnvelope(envelope);
      overview.value = workflowOverview;
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      loading.value = false;
    }
  }

  async function saveDraft(): Promise<void> {
    if (!editable.value || busy.value) {
      return;
    }
    saving.value = true;
    try {
      await options.validate();
      const isNew = entityId.value === null;
      const id = await persist();
      await workflow.refresh();
      message.success('草稿已保存');
      if (isNew) {
        await router.replace({ name: options.editRouteName, params: { id } });
      }
    } catch (error) {
      if (!isFormValidationError(error)) {
        message.error(errorMessage(error));
      }
    } finally {
      saving.value = false;
    }
  }

  async function saveAndSubmit(): Promise<void> {
    if (!editable.value || busy.value) {
      return;
    }
    submitting.value = true;
    try {
      await options.validate();
      const id = await persist();
      await apiRequest(CONTRACT_API.submit(id), {
        method: 'POST',
        body: { requestId: requestId() },
      });
      await workflow.refresh();
      message.success('单据已提交审批');
      await router.push(documentDetailPath(options.documentType, id));
    } catch (error) {
      if (!isFormValidationError(error)) {
        message.error(errorMessage(error));
      }
    } finally {
      submitting.value = false;
    }
  }

  async function persist(): Promise<string> {
    const currentId = entityId.value;
    // 首次制单创建领域实体，之后始终修订同一份草稿。
    const envelope = await apiRequest<ApiEnvelope<TEntity>>(
      currentId ? options.itemPath(currentId) : options.createPath,
      {
        method: currentId ? 'PATCH' : 'POST',
        body: options.payload() as Record<string, unknown>,
      },
    );
    options.assign(envelope.data);
    applyEnvelope(envelope);
    return envelope.data.id;
  }

  function applyEnvelope(envelope: ApiEnvelope<TEntity>): void {
    entityId.value = envelope.data.id;
    documentNumber.value = envelope.data.number;
    status.value = envelope.document.status as DocumentStatus;
    revision.value = envelope.document.revision;
  }

  function backToList(): void {
    void router.push({ name: options.listRouteName ?? 'contract-list' });
  }

  return {
    entityId,
    documentNumber,
    status,
    revision,
    overview,
    loading,
    saving,
    submitting,
    editable,
    busy,
    initialize,
    saveDraft,
    saveAndSubmit,
    backToList,
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '操作失败，请稍后重试';
}

function isFormValidationError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'errorFields' in error;
}
