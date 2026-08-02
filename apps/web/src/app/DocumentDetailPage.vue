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
import { apiRequest, requestId } from '../shared/api';
import DocumentDataView from '../shared/components/DocumentDataView.vue';
import DocumentFormLayout from '../shared/components/DocumentFormLayout.vue';
import FormSection from '../shared/components/FormSection.vue';
import WorkflowFlowGraph from '../shared/components/WorkflowFlowGraph.vue';
import WorkflowSidebar from '../shared/components/WorkflowSidebar.vue';
import { documentEditPath, documentTypeMeta, type DocumentTypeMeta } from '../shared/document';
import { useSessionStore } from '../shared/session';
import { useWorkflowStore } from '../shared/workflow';
import { businessDocumentPrintPath } from '../modules/document-print/print-route';
import PettyProcurementDetail from '../modules/petty/components/PettyProcurementDetail.vue';
import type { PettyProcurementData } from '../modules/petty/petty.types';
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
const approvalDialogOpen = ref(false);
const approvalAction = ref<'approve' | 'return'>('approve');
const approvalComment = ref('');
const approvalSubmitting = ref(false);
const approvalRequestId = ref<string | null>(null);

const documentType = computed(() => route.params.documentType as DocumentType);
const pettyData = computed(() =>
  documentType.value === 'PETTY_PROCUREMENT' && envelope.value
    ? (envelope.value.data as unknown as PettyProcurementData)
    : null,
);
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
const myPendingTask = computed(
  () =>
    workflow.tasks.find(
      (task) => task.documentId === documentId.value && task.status === 'PENDING',
    ) ?? null,
);

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
    if (session.can('WORKFLOW_APPROVE')) {
      try {
        await workflow.refresh();
      } catch {
        /* 待办列表加载失败不影响单据详情展示 */
      }
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : '单据加载失败');
  } finally {
    loading.value = false;
  }
}

function openApproval(): void {
  if (!myPendingTask.value) return;
  approvalAction.value = 'approve';
  approvalComment.value = '';
  approvalRequestId.value = requestId();
  approvalDialogOpen.value = true;
}

async function submitApproval(): Promise<void> {
  const task = myPendingTask.value;
  if (!task || !approvalRequestId.value || !approvalComment.value.trim()) return;
  approvalSubmitting.value = true;
  try {
    await workflow.completeTask(
      task.id,
      approvalAction.value,
      approvalComment.value.trim(),
      approvalRequestId.value,
    );
    message.success(approvalAction.value === 'approve' ? '审批已提交' : '单据已退回发起人');
    approvalDialogOpen.value = false;
    approvalRequestId.value = null;
    await load();
  } catch (error) {
    message.error(error instanceof Error ? error.message : '审批处理失败');
  } finally {
    approvalSubmitting.value = false;
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

    <FormSection v-if="overview" title="审批流程">
      <WorkflowFlowGraph
        :actionable-task-id="myPendingTask?.id ?? null"
        :overview="overview"
        @act="openApproval"
      />
    </FormSection>

    <FormSection v-if="envelope" title="单据信息">
      <PettyProcurementDetail v-if="pettyData" :data="pettyData" @changed="load" />
      <DocumentDataView v-else :data="envelope.data" />
    </FormSection>

    <template #aside>
      <WorkflowSidebar :loading="loading" :overview="overview" />
    </template>
  </DocumentFormLayout>
  <WorkflowCopyDialog v-model:open="copyDialogOpen" :document-id="documentId" />

  <a-modal
    v-model:open="approvalDialogOpen"
    :confirm-loading="approvalSubmitting"
    :ok-button-props="{ disabled: !approvalComment.trim() }"
    :title="approvalAction === 'approve' ? '同意审批' : '退回单据'"
    @ok="submitApproval"
  >
    <a-radio-group v-model:value="approvalAction" style="margin-bottom: 12px">
      <a-radio-button value="approve">同意</a-radio-button>
      <a-radio-button value="return">退回</a-radio-button>
    </a-radio-group>
    <a-textarea
      v-model:value="approvalComment"
      :maxlength="500"
      placeholder="请输入审批意见"
      :rows="4"
      show-count
    />
  </a-modal>
</template>
