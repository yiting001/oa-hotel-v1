<script setup lang="ts">
import { Plus, Refresh, Search, Close } from '@element-plus/icons-vue';
import type { DocumentStatus, DocumentSummary } from '@oa/contracts';
import { requiredBusinessModulePermissions } from '@oa/contracts';
import { ElMessage } from 'element-plus';
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import AppPageHeader from '../../../shared/components/AppPageHeader.vue';
import StatusTag from '../../../shared/components/StatusTag.vue';
import WorkspaceFilterBar from '../../../shared/components/WorkspaceFilterBar.vue';
import { documentDetailPath } from '../../../shared/document';
import { formatDateTime } from '../../../shared/format';
import { useSessionStore } from '../../../shared/session';
import { useWorkflowStore } from '../../../shared/workflow';
import UiDataList from '../../../ui/UiDataList.vue';
import UiPagination from '../../../ui/UiPagination.vue';
import { useLayoutMode } from '../../../ui/useLayoutMode';
import { DOCUMENT_STATUS_OPTIONS } from '../../contract/contract.config';
import { PURCHASE_ROUTE_NAMES } from '../purchase.config';

const router = useRouter();
const session = useSessionStore();
const workflow = useWorkflowStore();
const { isCompact } = useLayoutMode();
const createPermissions = requiredBusinessModulePermissions('PURCHASE', 'CREATE');
const canCreate = computed(() => createPermissions.every((code) => session.can(code)));
const keyword = ref('');
const documentStatus = ref<DocumentStatus | ''>('');
const page = ref(1);
const pageSize = ref(10);
const documents = computed(() => workflow.documents.filter((document) => document.documentType === 'PURCHASE_APPROVAL'));
const filteredDocuments = computed(() => {
  const query = keyword.value.trim().toLocaleLowerCase();
  return documents.value.filter((document) =>
    (!query || document.title.toLocaleLowerCase().includes(query)) &&
    (!documentStatus.value || document.status === documentStatus.value),
  );
});
watch([keyword, documentStatus], () => { page.value = 1; });
watch(filteredDocuments, (rows) => { page.value = Math.min(page.value, Math.max(1, Math.ceil(rows.length / pageSize.value))); });
const visibleDocuments = computed(() => filteredDocuments.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const metrics = computed(() => [
  { label: '全部单据', value: documents.value.length },
  { label: '待完善', value: documents.value.filter((document) => ['DRAFT', 'RETURNED'].includes(document.status)).length },
  { label: '审批中', value: documents.value.filter((document) => document.status === 'IN_REVIEW').length },
  { label: '已通过', value: documents.value.filter((document) => document.status === 'APPROVED').length },
]);
const columns = [
  { key: 'title', label: '采购事项', minWidth: 280 },
  { key: 'documentNo', label: '单据编号', width: 180 },
  { key: 'status', label: '状态', width: 110 },
  { key: 'revision', label: '修订', width: 76 },
  { key: 'updatedAt', label: '更新时间', width: 180 },
  { key: 'actions', label: '操作', width: 90 },
];
async function refresh(): Promise<void> {
  try { await workflow.refresh(); }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '采购单据加载失败'); }
}
function openDocument(document: DocumentSummary): void { void router.push(documentDetailPath(document.documentType, document.id)); }
function resetFilters(): void {
  keyword.value = '';
  documentStatus.value = '';
}
onMounted(() => { void refresh(); });
</script>

<template>
  <div class="ui-page purchase-list-page">
    <AppPageHeader description="采购事项的发起与审批" eyebrow="采购管理" title="采购审批">
      <template #actions><div class="ui-actions">
        <el-button v-if="canCreate" type="primary" @click="router.push({ name: PURCHASE_ROUTE_NAMES.create })"><el-icon><Plus /></el-icon>新建采购审批</el-button>
        <el-button :icon="Refresh" :loading="workflow.loading" aria-label="刷新" title="刷新" @click="refresh" />
      </div></template>
    </AppPageHeader>
    <div class="purchase-list__metrics" :class="{ 'is-compact': isCompact }" aria-label="采购单据统计">
      <div v-for="metric in metrics" :key="metric.label"><span>{{ metric.label }}</span><strong>{{ metric.value }}</strong></div>
    </div>
    <WorkspaceFilterBar label="采购单据筛选" :result-label="`共 ${filteredDocuments.length} 条`">
      <template #search>
        <el-input v-model="keyword" clearable :prefix-icon="Search" placeholder="搜索采购事项" aria-label="搜索单据" />
      </template>
      <template #filters>
        <el-select v-model="documentStatus" clearable placeholder="全部状态" aria-label="单据状态">
          <el-option v-for="option in DOCUMENT_STATUS_OPTIONS" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
      </template>
      <template #actions>
        <el-button v-if="keyword || documentStatus" :icon="Close" @click="resetFilters">清空</el-button>
      </template>
    </WorkspaceFilterBar>
    <UiDataList :rows="visibleDocuments" :columns="columns" :loading="workflow.loading" empty-text="暂无符合条件的采购单据" @row-click="openDocument">
      <template #cell-title="{ row }"><strong>{{ row.title }}</strong></template>
      <template #cell-status="{ row }"><StatusTag :status="row.status" /></template>
      <template #cell-updatedAt="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
      <template #mobile-title="{ row }"><button class="purchase-list__link" type="button" @click="openDocument(row)">{{ row.title }}</button><StatusTag :status="row.status" /></template>
      <template #mobile-summary="{ row }"><div class="purchase-list__summary">{{ row.documentNo || '未编号' }} · {{ formatDateTime(row.updatedAt) }} · 修订 {{ row.revision }}</div></template>
      <template #actions="{ row }"><el-button link type="primary" @click="openDocument(row)">查看</el-button></template>
    </UiDataList>
    <UiPagination v-model:page="page" v-model:page-size="pageSize" :total="filteredDocuments.length" />
  </div>
</template>

<style scoped>
.purchase-list__metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-block: 1px solid var(--color-border); }
.purchase-list__metrics.is-compact { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.purchase-list__metrics > div { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 16px 20px; border-right: 1px solid var(--color-border); }
.purchase-list__metrics.is-compact > div { padding: 12px 8px; }
.purchase-list__metrics span, .purchase-list__summary { color: var(--color-text-secondary); font-size: 13px; }
.purchase-list__metrics strong { font-size: 22px; font-weight: 650; }
.purchase-list__link { padding: 0; border: 0; background: none; color: var(--color-text); text-align: left; font: inherit; font-weight: 600; cursor: pointer; }
.purchase-list__summary { margin-top: 8px; }
</style>
