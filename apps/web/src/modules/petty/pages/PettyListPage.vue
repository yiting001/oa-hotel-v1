<script setup lang="ts">
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue';
import type { DocumentStatus, DocumentSummary } from '@oa/contracts';
import { requiredBusinessModulePermissions } from '@oa/contracts';
import { message } from 'ant-design-vue';
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import AppPageHeader from '../../../shared/components/AppPageHeader.vue';
import DocumentTable from '../../../shared/components/DocumentTable.vue';
import WorkspaceFilterBar from '../../../shared/components/WorkspaceFilterBar.vue';
import WorkspaceMetricStrip from '../../../shared/components/WorkspaceMetricStrip.vue';
import { documentDetailPath } from '../../../shared/document';
import { useSessionStore } from '../../../shared/session';
import { useWorkflowStore } from '../../../shared/workflow';
import { DOCUMENT_STATUS_OPTIONS } from '../../contract/contract.config';
import { PETTY_ROUTE_NAMES } from '../petty.config';

const router = useRouter();
const session = useSessionStore();
const workflow = useWorkflowStore();
const createPermissions = requiredBusinessModulePermissions('PETTY', 'CREATE');
const canCreate = computed(() => createPermissions.every((code) => session.can(code)));
const keyword = ref('');
const documentStatus = ref<DocumentStatus>();

const pettyDocuments = computed(() =>
  workflow.documents.filter((document) => document.documentType === 'PETTY_PROCUREMENT'),
);

const filteredDocuments = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLocaleLowerCase();
  return pettyDocuments.value.filter((document) => {
    const matchesKeyword =
      !normalizedKeyword || document.title.toLocaleLowerCase().includes(normalizedKeyword);
    const matchesStatus = !documentStatus.value || document.status === documentStatus.value;
    return matchesKeyword && matchesStatus;
  });
});

const metricItems = computed(() => [
  { key: 'all', label: '全部单据', value: pettyDocuments.value.length },
  {
    key: 'attention',
    label: '待完善',
    value: pettyDocuments.value.filter((document) =>
      ['DRAFT', 'RETURNED'].includes(document.status),
    ).length,
  },
  {
    key: 'reviewing',
    label: '审批中',
    value: pettyDocuments.value.filter((document) => document.status === 'IN_REVIEW').length,
  },
  {
    key: 'approved',
    label: '已通过',
    value: pettyDocuments.value.filter((document) => document.status === 'APPROVED').length,
  },
]);

async function refresh(): Promise<void> {
  try {
    await workflow.refresh();
  } catch (error) {
    message.error(error instanceof Error ? error.message : '零星采买单据加载失败');
  }
}

function openDocument(document: DocumentSummary): void {
  void router.push(documentDetailPath(document.documentType, document.id));
}

onMounted(() => {
  void refresh();
});
</script>

<template>
  <div class="petty-list-page">
    <AppPageHeader description="餐饮物资的零星采买申请与审批" eyebrow="采购管理" title="零星采买">
      <template #actions>
        <a-space wrap>
          <a-button
            v-if="canCreate"
            type="primary"
            @click="router.push({ name: PETTY_ROUTE_NAMES.create })"
          >
            <template #icon><PlusOutlined /></template>
            新建零星采买
          </a-button>
          <a-button @click="refresh">
            <template #icon><ReloadOutlined /></template>
            刷新
          </a-button>
        </a-space>
      </template>
    </AppPageHeader>

    <WorkspaceMetricStrip :items="metricItems" label="零星采买单据统计" />

    <WorkspaceFilterBar :result-label="`共 ${filteredDocuments.length} 条`" label="零星采买筛选">
      <template #search>
        <a-input v-model:value="keyword" allow-clear placeholder="搜索单据标题" />
      </template>
      <a-select
        v-model:value="documentStatus"
        :options="DOCUMENT_STATUS_OPTIONS"
        allow-clear
        placeholder="单据状态"
        style="min-width: 160px"
      />
    </WorkspaceFilterBar>

    <DocumentTable
      :documents="filteredDocuments"
      :loading="workflow.loading"
      @open="openDocument"
    />
  </div>
</template>
