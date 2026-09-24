<script setup lang="ts">
import { Refresh, Search } from '@element-plus/icons-vue';
import type { DocumentStatus, DocumentType } from '@oa/contracts';
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { apiRequest } from '../../../shared/api';
import AppPageHeader from '../../../shared/components/AppPageHeader.vue';
import { documentDetailPath, documentStatusMeta, documentTypeMeta } from '../../../shared/document';
import { formatDateTime } from '../../../shared/format';
import UiDataList from '../../../ui/UiDataList.vue';
import UiDialog from '../../../ui/UiDialog.vue';
import UiPagination from '../../../ui/UiPagination.vue';
import { useLayoutMode } from '../../../ui/useLayoutMode';
import { DOCUMENT_STATUS_OPTIONS } from '../../contract/contract.config';
import { formatYuan } from '../../petty/petty.format';
import { INSIGHT_API, TRACKED_DOCUMENT_TYPE_OPTIONS } from '../insight.config';
import type { DocumentSearchRow } from '../insight.types';

const router = useRouter();
const { isCompact } = useLayoutMode();
const loading = ref(false);
const rows = ref<DocumentSearchRow[]>([]);
const filterOpen = ref(false);
const page = ref(1);
const pageSize = ref(20);
const visibleRows = computed(() => rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const columns = [
  { key: 'documentNo', label: '单据编号', minWidth: 150 },
  { key: 'documentType', label: '单据类型', minWidth: 130 },
  { key: 'title', label: '标题', minWidth: 220 },
  { key: 'applicantName', label: '申请人', minWidth: 110 },
  { key: 'amountCents', label: '金额', minWidth: 110 },
  { key: 'status', label: '状态', width: 105 },
  { key: 'createdAt', label: '发起时间', minWidth: 170 },
  { key: 'actions', label: '操作', width: 78 },
];

const filters = reactive({
  number: '', keyword: '', applicant: '',
  documentType: undefined as string | undefined,
  status: undefined as string | undefined,
  dateRange: null as [string, string] | null,
  amountMinYuan: null as number | null,
  amountMaxYuan: null as number | null,
});

async function search(): Promise<void> {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (filters.number.trim()) params.set('number', filters.number.trim());
    if (filters.keyword.trim()) params.set('keyword', filters.keyword.trim());
    if (filters.applicant.trim()) params.set('applicant', filters.applicant.trim());
    if (filters.documentType) params.set('documentType', filters.documentType);
    if (filters.status) params.set('status', filters.status);
    if (filters.dateRange?.[0]) params.set('dateFrom', filters.dateRange[0]);
    if (filters.dateRange?.[1]) params.set('dateTo', filters.dateRange[1]);
    if (filters.amountMinYuan !== null) params.set('amountMinCents', String(Math.round(filters.amountMinYuan * 100)));
    if (filters.amountMaxYuan !== null) params.set('amountMaxCents', String(Math.round(filters.amountMaxYuan * 100)));
    const query = params.toString();
    rows.value = await apiRequest<DocumentSearchRow[]>(query ? `${INSIGHT_API.documents}?${query}` : INSIGHT_API.documents);
    page.value = 1;
    filterOpen.value = false;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '单据检索失败');
  } finally {
    loading.value = false;
  }
}

function reset(): void {
  Object.assign(filters, { number: '', keyword: '', applicant: '', documentType: undefined, status: undefined,
    dateRange: null, amountMinYuan: null, amountMaxYuan: null });
  void search();
}
function openDocument(row: DocumentSearchRow): void {
  void router.push(documentDetailPath(row.documentType as DocumentType, row.id));
}
function typeLabel(documentType: string): string {
  return documentTypeMeta[documentType as DocumentType]?.label ?? documentType;
}
function statusLabel(status: string): string {
  return documentStatusMeta[status as DocumentStatus]?.label ?? status;
}
function changePage(next: { page: number; pageSize: number }): void {
  page.value = next.page;
  pageSize.value = next.pageSize;
}
onMounted(() => void search());
</script>

<template>
  <main class="ui-page insight-documents-page">
    <AppPageHeader eyebrow="运营分析" title="单据检索" />
    <div class="ui-toolbar insight-search-toolbar">
      <el-input v-model="filters.number" clearable placeholder="单据编号" aria-label="单据编号" @keyup.enter="search" />
      <el-input v-model="filters.keyword" clearable placeholder="标题关键字" aria-label="标题关键字" @keyup.enter="search" />
      <template v-if="!isCompact">
        <el-input v-model="filters.applicant" clearable placeholder="申请人" aria-label="申请人" @keyup.enter="search" />
        <el-select v-model="filters.documentType" clearable placeholder="单据类型" aria-label="单据类型">
          <el-option v-for="option in TRACKED_DOCUMENT_TYPE_OPTIONS" :key="option.value" :value="option.value" :label="option.label" />
        </el-select>
        <el-select v-model="filters.status" clearable placeholder="状态" aria-label="状态">
          <el-option v-for="option in DOCUMENT_STATUS_OPTIONS" :key="option.value" :value="option.value" :label="option.label" />
        </el-select>
        <el-date-picker v-model="filters.dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" range-separator="至" />
        <el-input-number v-model="filters.amountMinYuan" :min="0" placeholder="金额下限" aria-label="金额下限" />
        <el-input-number v-model="filters.amountMaxYuan" :min="0" placeholder="金额上限" aria-label="金额上限" />
      </template>
      <el-button v-if="isCompact" @click="filterOpen = true">筛选</el-button>
      <div class="ui-toolbar__end">
        <el-button :icon="Search" type="primary" @click="search">查询</el-button>
        <el-button :icon="Refresh" @click="reset">重置</el-button>
      </div>
    </div>
    <UiDataList :rows="visibleRows" :columns="columns" :loading="loading" empty-text="暂无单据" @row-click="openDocument">
      <template #cell-documentNo="{ row }">{{ row.documentNo ?? '未提交' }}</template>
      <template #cell-documentType="{ row }">{{ typeLabel(row.documentType) }}</template>
      <template #cell-amountCents="{ row }">{{ row.amountCents !== null ? formatYuan(row.amountCents) : '-' }}</template>
      <template #cell-status="{ row }"><el-tag effect="plain" size="small">{{ statusLabel(row.status) }}</el-tag></template>
      <template #cell-createdAt="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      <template #mobile-title="{ row }">{{ row.title }}</template>
      <template #actions="{ row }"><el-button link @click="openDocument(row)">查看</el-button></template>
      <template #mobile-summary="{ row }">{{ row.documentNo ?? '未提交' }} · {{ typeLabel(row.documentType) }} · {{ statusLabel(row.status) }}<br />{{ row.applicantName }} · {{ row.amountCents !== null ? formatYuan(row.amountCents) : '-' }} · {{ formatDateTime(row.createdAt) }}</template>
    </UiDataList>
    <UiPagination v-model:page="page" v-model:page-size="pageSize" :total="rows.length" @change="changePage" />
    <UiDialog v-model="filterOpen" title="筛选单据">
      <div class="ui-filter-grid insight-filter-sheet">
        <el-input v-model="filters.applicant" clearable placeholder="申请人" aria-label="申请人" />
        <el-select v-model="filters.documentType" clearable placeholder="单据类型" aria-label="单据类型"><el-option v-for="option in TRACKED_DOCUMENT_TYPE_OPTIONS" :key="option.value" :value="option.value" :label="option.label" /></el-select>
        <el-select v-model="filters.status" clearable placeholder="状态" aria-label="状态"><el-option v-for="option in DOCUMENT_STATUS_OPTIONS" :key="option.value" :value="option.value" :label="option.label" /></el-select>
        <el-date-picker v-model="filters.dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" range-separator="至" />
        <el-input-number v-model="filters.amountMinYuan" :min="0" placeholder="金额下限" aria-label="金额下限" />
        <el-input-number v-model="filters.amountMaxYuan" :min="0" placeholder="金额上限" aria-label="金额上限" />
      </div>
      <template #footer><el-button @click="reset">重置</el-button><el-button type="primary" @click="search">查询</el-button></template>
    </UiDialog>
  </main>
</template>
