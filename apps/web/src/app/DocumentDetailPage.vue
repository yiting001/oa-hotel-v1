<script setup lang="ts">
import {
  EditOutlined,
  PrinterOutlined,
  ShareAltOutlined,
  ToolOutlined,
} from '@ant-design/icons-vue';
import {
  requiredBusinessModulePermissions,
  type DocumentSummary,
  type DocumentType,
  type WorkflowOverview,
} from '@oa/contracts';
import { message } from 'ant-design-vue';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { apiRequest } from '../shared/api';
import DocumentDataView from '../shared/components/DocumentDataView.vue';
import DocumentFormLayout from '../shared/components/DocumentFormLayout.vue';
import FormSection from '../shared/components/FormSection.vue';
import WorkflowSidebar from '../shared/components/WorkflowSidebar.vue';
import { documentEditPath, documentTypeMeta, type DocumentTypeMeta } from '../shared/document';
import { useSessionStore } from '../shared/session';
import { useWorkflowStore } from '../shared/workflow';
import { businessDocumentPrintPath } from '../modules/document-print/print-route';
import DocumentFollowButton from '../modules/workbench/components/DocumentFollowButton.vue';
import WorkflowCopyDialog from '../modules/workbench/components/WorkflowCopyDialog.vue';
import { usePersonalWorkbenchStore } from '../modules/workbench/store/workbench';

interface DetailEnvelope {
  data: Record<string, unknown>;
  document: DocumentSummary;
}

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const workflow = useWorkflowStore();
const workbench = usePersonalWorkbenchStore();
const loading = ref(false);
const envelope = ref<DetailEnvelope | null>(null);
const overview = ref<WorkflowOverview | null>(null);
const copyDialogOpen = ref(false);

const documentType = computed(() => route.params.documentType as DocumentType);
const meta = computed<DocumentTypeMeta | null>(() => documentTypeMeta[documentType.value] ?? null);
const documentId = computed(() => String(route.params.id));
const documentNumber = computed(() =>
  String(envelope.value?.document.documentNo ?? envelope.value?.data.number ?? ''),
);
const editable = computed(() => {
  const document = envelope.value?.document;
  return (
    document &&
    requiredBusinessModulePermissions(document.module, 'CREATE').every((code) =>
      session.can(code),
    ) &&
    ['DRAFT', 'RETURNED'].includes(document.status) &&
    document.applicantId === session.user?.id
  );
});
const executionPath = computed(() => {
  const document = envelope.value?.document;
  if (!document || document.status !== 'APPROVED') return null;
  if (['SEAL_BORROW', 'SEAL_USE'].includes(document.documentType) && session.can('SEAL_EXECUTE')) {
    return `/seal/execution/${document.documentType}/${document.id}`;
  }
  if (document.documentType === 'MATERIAL_REQUISITION' && session.can('SUPPLY_ISSUE')) {
    return `/supply/issues/${document.id}`;
  }
  return null;
});

onMounted(load);
watch(() => route.fullPath, load);

async function load(): Promise<void> {
  if (!meta.value) {
    await router.replace('/not-found');
    return;
  }
  loading.value = true;
  copyDialogOpen.value = false;
  try {
    const [detail, workflowOverview] = await Promise.all([
      apiRequest<DetailEnvelope>(meta.value.apiPath(documentId.value)),
      workflow.loadOverview(documentId.value),
    ]);
    envelope.value = detail;
    overview.value = workflowOverview;
  } catch (error) {
    message.error(error instanceof Error ? error.message : '单据加载失败');
  } finally {
    loading.value = false;
  }
}

function edit(): void {
  void router.push(documentEditPath(documentType.value, documentId.value));
}

function print(): void {
  void router.push(businessDocumentPrintPath(documentType.value, documentId.value));
}

async function refreshWorkbenchSummary(): Promise<void> {
  try {
    await workbench.refreshSummary();
  } catch (error) {
    message.warning(error instanceof Error ? error.message : '工作台摘要刷新失败');
  }
}
</script>

<template>
  <DocumentFormLayout
    :description="meta ? `${meta.moduleLabel} · ${meta.label}` : undefined"
    :document-number="documentNumber"
    :loading="loading"
    :revision="envelope?.document.revision"
    :status="envelope?.document.status"
    :title="envelope?.document.title ?? '单据详情'"
  >
    <template #headerActions>
      <a-space wrap>
        <a-button v-if="editable" @click="edit">
          <template #icon><EditOutlined /></template>
          编辑
        </a-button>
        <a-button v-if="executionPath" type="primary" @click="router.push(executionPath)">
          <template #icon><ToolOutlined /></template>
          执行登记
        </a-button>
        <DocumentFollowButton
          v-if="session.can('DOCUMENT_FOLLOW')"
          :document-id="documentId"
          @changed="refreshWorkbenchSummary"
        />
        <a-button v-if="session.can('WORKFLOW_COPY')" @click="copyDialogOpen = true">
          <template #icon><ShareAltOutlined /></template>
          抄送
        </a-button>
        <a-button @click="print">
          <template #icon><PrinterOutlined /></template>
          打印
        </a-button>
      </a-space>
    </template>

    <FormSection v-if="envelope" title="单据信息">
      <DocumentDataView :data="envelope.data" />
    </FormSection>

    <template #aside>
      <WorkflowSidebar :loading="loading" :overview="overview" />
    </template>
  </DocumentFormLayout>
  <WorkflowCopyDialog v-model:open="copyDialogOpen" :document-id="documentId" />
</template>
