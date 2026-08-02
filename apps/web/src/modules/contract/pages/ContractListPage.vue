<script setup lang="ts">
import { ClearOutlined, PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue';
import type { DocumentStatus, DocumentSummary, DocumentType } from '@oa/contracts';
import { requiredBusinessModulePermissions } from '@oa/contracts';
import { message } from 'ant-design-vue';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppPageHeader from '../../../shared/components/AppPageHeader.vue';
import DocumentTable from '../../../shared/components/DocumentTable.vue';
import WorkspaceFilterBar from '../../../shared/components/WorkspaceFilterBar.vue';
import WorkspaceMetricStrip from '../../../shared/components/WorkspaceMetricStrip.vue';
import { documentDetailPath, documentTypeMeta } from '../../../shared/document';
import { useSessionStore } from '../../../shared/session';
import { useWorkflowStore } from '../../../shared/workflow';
import {
  CONTRACT_DOCUMENT_TYPES,
  CONTRACT_ROUTE_NAMES,
  CONTRACT_TYPE_OPTIONS,
  DOCUMENT_STATUS_OPTIONS,
} from '../contract.config';

const router = useRouter();
const session = useSessionStore();
const workflow = useWorkflowStore();
const createPermissions = requiredBusinessModulePermissions('CONTRACT', 'CREATE');
const canCreate = computed(() => createPermissions.every((code) => session.can(code)));
const keyword = ref('');
const documentType = ref<DocumentType>();
const documentStatus = ref<DocumentStatus>();

const contractDocuments = computed(() =>
  workflow.documents.filter((document) => CONTRACT_DOCUMENT_TYPES.includes(document.documentType)),
);

const filteredDocuments = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLocaleLowerCase();
  return contractDocuments.value.filter((document) => {
    const matchesKeyword =
      !normalizedKeyword ||
      document.title.toLocaleLowerCase().includes(normalizedKeyword) ||
      documentTypeMeta[document.documentType].label.toLocaleLowerCase().includes(normalizedKeyword);
    const matchesType = !documentType.value || document.documentType === documentType.value;
    const matchesStatus = !documentStatus.value || document.status === documentStatus.value;
    return matchesKeyword && matchesType && matchesStatus;
  });
});

const statusCounts = computed(() => ({
  all: contractDocuments.value.length,
  attention: contractDocuments.value.filter((document) =>
    ['DRAFT', 'RETURNED'].includes(document.status),
  ).length,
  reviewing: contractDocuments.value.filter((document) => document.status === 'IN_REVIEW').length,
  approved: contractDocuments.value.filter((document) => document.status === 'APPROVED').length,
}));
const metricItems = computed(() => [
  { key: 'all', label: '全部单据', value: statusCounts.value.all },
  { key: 'attention', label: '待完善', value: statusCounts.value.attention },
  { key: 'reviewing', label: '审批中', value: statusCounts.value.reviewing },
  { key: 'approved', label: '已通过', value: statusCounts.value.approved },
]);
const hasActiveFilters = computed(
  () =>
    Boolean(keyword.value.trim()) || Boolean(documentType.value) || Boolean(documentStatus.value),
);

async function refresh(): Promise<void> {
  try {
    await workflow.refresh();
  } catch (error) {
    message.error(error instanceof Error ? error.message : '合同单据加载失败');
  }
}

function openDocument(document: DocumentSummary): void {
  void router.push(documentDetailPath(document.documentType, document.id));
}

function resetFilters(): void {
  keyword.value = '';
  documentType.value = undefined;
  documentStatus.value = undefined;
}

onMounted(() => {
  void refresh();
});
</script>

<template>
  <div class="contract-list-page">
    <AppPageHeader
      description="合同请示、签约审批与履约付款"
      eyebrow="合同管理"
      title="合同与支出管理"
    >
      <template #actions>
        <a-space wrap>
          <a-button
            v-if="canCreate"
            type="primary"
            @click="router.push({ name: CONTRACT_ROUTE_NAMES.requestCreate })"
          >
            <template #icon><PlusOutlined /></template>
            新建请示
          </a-button>
          <a-button
            v-if="canCreate"
            @click="router.push({ name: CONTRACT_ROUTE_NAMES.approvalCreate })"
          >
            <template #icon><PlusOutlined /></template>
            新建合同审批
          </a-button>
          <a-button
            v-if="canCreate"
            @click="router.push({ name: CONTRACT_ROUTE_NAMES.paymentCreate })"
          >
            <template #icon><PlusOutlined /></template>
            新建付款申请
          </a-button>
          <a-button aria-label="刷新" :loading="workflow.loading" @click="refresh">
            <template #icon><ReloadOutlined /></template>
            刷新
          </a-button>
        </a-space>
      </template>
    </AppPageHeader>

    <WorkspaceMetricStrip :items="metricItems" label="合同单据统计" />

    <WorkspaceFilterBar label="合同单据筛选" :result-label="`共 ${filteredDocuments.length} 条`">
      <template #search>
        <a-input v-model:value="keyword" allow-clear placeholder="搜索单据标题或类型">
          <template #prefix><SearchOutlined /></template>
        </a-input>
      </template>
      <template #filters>
        <a-select
          v-model:value="documentType"
          aria-label="合同类型"
          :options="CONTRACT_TYPE_OPTIONS"
          allow-clear
          placeholder="全部类型"
        />
        <a-select
          v-model:value="documentStatus"
          aria-label="合同状态"
          :options="DOCUMENT_STATUS_OPTIONS"
          allow-clear
          placeholder="全部状态"
        />
      </template>
      <template v-if="hasActiveFilters" #actions>
        <a-button @click="resetFilters">
          <template #icon><ClearOutlined /></template>
          清空筛选
        </a-button>
      </template>
    </WorkspaceFilterBar>

    <DocumentTable
      :documents="filteredDocuments"
      :loading="workflow.loading"
      @open="openDocument"
    />
  </div>
</template>

<style scoped>
.contract-list-page {
  min-width: 0;
}
</style>
