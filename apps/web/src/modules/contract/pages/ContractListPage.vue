<script setup lang="ts">
import WorkspaceMetricStrip from '../../../shared/components/WorkspaceMetricStrip.vue';
import WorkspaceFilterBar from '../../../shared/components/WorkspaceFilterBar.vue';
import { Plus, Refresh, Search, Close } from '@element-plus/icons-vue';
import type { DocumentStatus, DocumentSummary, DocumentType } from '@oa/contracts';
import { requiredBusinessModulePermissions } from '@oa/contracts';
import { ElMessage } from 'element-plus';
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppPageHeader from '../../../shared/components/AppPageHeader.vue';
import StatusTag from '../../../shared/components/StatusTag.vue';
import { documentDetailPath, documentTypeMeta } from '../../../shared/document';
import { formatDateTime } from '../../../shared/format';
import { useSessionStore } from '../../../shared/session';
import { useWorkflowStore } from '../../../shared/workflow';
import UiDataList from '../../../ui/UiDataList.vue';
import UiPagination from '../../../ui/UiPagination.vue';
import {
  CONTRACT_DOCUMENT_TYPES,
  CONTRACT_ROUTE_NAMES,
  CONTRACT_TYPE_OPTIONS,
  DOCUMENT_STATUS_OPTIONS,
} from '../contract.config';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const workflow = useWorkflowStore();
const createPermissions = requiredBusinessModulePermissions('CONTRACT', 'CREATE');
const canCreate = computed(() => createPermissions.every((code) => session.can(code)));
const keyword = ref('');
const documentType = ref<DocumentType | ''>('');
const documentStatus = ref<DocumentStatus | ''>('');
const page = ref(1);
const pageSize = ref(10);

/** 请示批复与合同审批各自独立的列表入口，由路由 meta 指定纳入的单据类型。 */
const listDocumentTypes = computed<DocumentType[]>(() => {
  const configured = route.meta.listDocumentTypes;
  return Array.isArray(configured) && configured.length > 0
    ? (configured as DocumentType[])
    : CONTRACT_DOCUMENT_TYPES;
});
const isRequestList = computed(() => listDocumentTypes.value.includes('CONTRACT_REQUEST'));
const pageCopy = computed(() =>
  isRequestList.value
    ? {
        eyebrow: '业务中心',
        title: '请示批复',
        description: '部门发起请示，经部门负责人、主管领导审批后由总经理批复。',
      }
    : {
        eyebrow: '业务中心',
        title: '合同审批',
        description: '合同签约审批与履约付款，行政办公室可指派外部律师或兄弟部门先行审核。',
      },
);
const contractDocuments = computed(() =>
  workflow.documents.filter((document) => listDocumentTypes.value.includes(document.documentType)),
);
const filteredDocuments = computed(() => {
  const query = keyword.value.trim().toLocaleLowerCase();
  return contractDocuments.value.filter((document) =>
    (!query || document.title.toLocaleLowerCase().includes(query) ||
      documentTypeMeta[document.documentType].label.toLocaleLowerCase().includes(query)) &&
    (!documentType.value || document.documentType === documentType.value) &&
    (!documentStatus.value || document.status === documentStatus.value),
  );
});
watch([keyword, documentType, documentStatus], () => { page.value = 1; });
watch(filteredDocuments, (rows) => {
  page.value = Math.min(page.value, Math.max(1, Math.ceil(rows.length / pageSize.value)));
});
const visibleDocuments = computed(() => filteredDocuments.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const metricStripItems = computed(() => [
  { key: 'all', label: '全部单据', value: contractDocuments.value.length },
  { key: 'incomplete', label: '待完善', value: contractDocuments.value.filter((document) => ['DRAFT', 'RETURNED'].includes(document.status)).length },
  { key: 'reviewing', label: '审批中', value: contractDocuments.value.filter((document) => document.status === 'IN_REVIEW').length },
  { key: 'approved', label: '已通过', value: contractDocuments.value.filter((document) => document.status === 'APPROVED').length },
]);
const columns = [
  { key: 'title', label: '单据标题', minWidth: 260 },
  { key: 'documentType', label: '类型', width: 160 },
  { key: 'status', label: '状态', width: 110 },
  { key: 'revision', label: '修订', width: 76 },
  { key: 'updatedAt', label: '更新时间', width: 180 },
  { key: 'actions', label: '操作', width: 90 },
];

async function refresh(): Promise<void> {
  try { await workflow.refresh(); }
  catch (error) { ElMessage.error(error instanceof Error ? error.message : '合同单据加载失败'); }
}
function openDocument(document: DocumentSummary): void {
  void router.push(documentDetailPath(document.documentType, document.id));
}
function resetFilters(): void {
  keyword.value = '';
  documentType.value = '';
  documentStatus.value = '';
}
onMounted(() => { void refresh(); });
</script>

<template>
  <div class="ui-page contract-list-page">
    <AppPageHeader
      :description="pageCopy.description"
      :eyebrow="pageCopy.eyebrow"
      :title="pageCopy.title"
    >
      <template #actions>
        <div class="ui-actions">
          <el-button v-if="canCreate && isRequestList" type="primary" @click="router.push({ name: CONTRACT_ROUTE_NAMES.requestCreate })"><el-icon><Plus /></el-icon>新建请示</el-button>
          <el-button v-if="canCreate && !isRequestList" type="primary" @click="router.push({ name: CONTRACT_ROUTE_NAMES.approvalCreate })"><el-icon><Plus /></el-icon>合同审批</el-button>
          <el-button v-if="canCreate && !isRequestList" @click="router.push({ name: CONTRACT_ROUTE_NAMES.paymentCreate })"><el-icon><Plus /></el-icon>付款申请</el-button>
          <el-button :icon="Refresh" :loading="workflow.loading" aria-label="刷新" title="刷新" @click="refresh" />
        </div>
      </template>
    </AppPageHeader>
    <WorkspaceMetricStrip label="合同单据统计" :items="metricStripItems" />
    <WorkspaceFilterBar :label="`${pageCopy.title}筛选`" :result-label="`共 ${filteredDocuments.length} 条`">
      <template #search>
        <el-input v-model="keyword" clearable :prefix-icon="Search" placeholder="搜索单据标题或类型" aria-label="搜索单据" />
      </template>
      <template #filters>
        <el-select v-model="documentType" placeholder="全部类型" aria-label="合同类型" clearable>
          <el-option
            v-for="option in CONTRACT_TYPE_OPTIONS.filter((item) => listDocumentTypes.includes(item.value))"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </el-select>
        <el-select v-model="documentStatus" placeholder="全部状态" aria-label="合同状态" clearable>
          <el-option v-for="option in DOCUMENT_STATUS_OPTIONS" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
      </template>
      <template #actions>
        <el-button v-if="keyword || documentType || documentStatus" :icon="Close" @click="resetFilters">清空</el-button>
      </template>
    </WorkspaceFilterBar>
    <UiDataList :rows="visibleDocuments" :columns="columns" :loading="workflow.loading" :empty-text="`暂无符合条件的${pageCopy.title}单据`" @row-click="openDocument">
      <template #cell-title="{ row }"><span class="contract-list__title">{{ row.title }}</span></template>
      <template #cell-documentType="{ row }">{{ documentTypeMeta[row.documentType].label }}</template>
      <template #cell-status="{ row }"><StatusTag :status="row.status" /></template>
      <template #cell-updatedAt="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
      <template #mobile-title="{ row }"><button class="contract-list__link" type="button" @click="openDocument(row)">{{ row.title }}</button><StatusTag :status="row.status" /></template>
      <template #mobile-summary="{ row }"><div class="contract-list__summary">{{ documentTypeMeta[row.documentType].label }} · {{ formatDateTime(row.updatedAt) }} · 修订 {{ row.revision }}</div></template>
      <template #actions="{ row }"><el-button link type="primary" @click="openDocument(row)">查看</el-button></template>
    </UiDataList>
    <UiPagination v-model:page="page" v-model:page-size="pageSize" :total="filteredDocuments.length" />
  </div>
</template>

<style scoped>
.contract-list__metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-block: 1px solid var(--color-border); }
.contract-list__metrics.is-compact { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.contract-list__metric { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 16px 20px; border-right: 1px solid var(--color-border); }
.contract-list__metric:last-child { border-right: 0; }
.contract-list__metrics.is-compact .contract-list__metric { padding: 12px 8px; }
.contract-list__metric span, .contract-list__summary { color: var(--color-text-secondary); font-size: 13px; }
.contract-list__metric strong { font-size: 22px; font-weight: 650; }
.contract-list__title { font-weight: 600; }
.contract-list__link { padding: 0; border: 0; background: none; color: var(--color-text); text-align: left; font: inherit; font-weight: 600; cursor: pointer; }
.contract-list__summary { margin-top: 8px; }
</style>
