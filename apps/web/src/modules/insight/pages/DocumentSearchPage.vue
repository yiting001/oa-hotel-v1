<script setup lang="ts">
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue';
import type { DocumentStatus, DocumentType } from '@oa/contracts';
import { message } from 'ant-design-vue';
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { apiRequest } from '../../../shared/api';
import AppPageHeader from '../../../shared/components/AppPageHeader.vue';
import { documentDetailPath, documentStatusMeta, documentTypeMeta } from '../../../shared/document';
import { DOCUMENT_STATUS_OPTIONS } from '../../contract/contract.config';
import { formatYuan } from '../../petty/petty.format';
import { INSIGHT_API, TRACKED_DOCUMENT_TYPE_OPTIONS } from '../insight.config';
import type { DocumentSearchRow } from '../insight.types';

const router = useRouter();
const loading = ref(false);
const rows = ref<DocumentSearchRow[]>([]);

const filters = reactive({
  number: '',
  keyword: '',
  applicant: '',
  documentType: undefined as string | undefined,
  status: undefined as string | undefined,
  dateRange: null as [string, string] | null,
  amountMinYuan: null as number | null,
  amountMaxYuan: null as number | null,
});

const columns = [
  { title: '单据编号', key: 'documentNo' },
  { title: '单据类型', key: 'documentType' },
  { title: '标题', dataIndex: 'title' },
  { title: '申请人', dataIndex: 'applicantName' },
  { title: '金额', key: 'amount' },
  { title: '状态', key: 'status' },
  { title: '发起时间', key: 'createdAt' },
];

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
    if (filters.amountMinYuan !== null) {
      params.set('amountMinCents', String(Math.round(filters.amountMinYuan * 100)));
    }
    if (filters.amountMaxYuan !== null) {
      params.set('amountMaxCents', String(Math.round(filters.amountMaxYuan * 100)));
    }
    const query = params.toString();
    rows.value = await apiRequest<DocumentSearchRow[]>(
      query ? `${INSIGHT_API.documents}?${query}` : INSIGHT_API.documents,
    );
  } catch (error) {
    message.error(error instanceof Error ? error.message : '单据检索失败');
  } finally {
    loading.value = false;
  }
}

function reset(): void {
  Object.assign(filters, {
    number: '',
    keyword: '',
    applicant: '',
    documentType: undefined,
    status: undefined,
    dateRange: null,
    amountMinYuan: null,
    amountMaxYuan: null,
  });
  void search();
}

function openDocument(row: DocumentSearchRow): void {
  void router.push(documentDetailPath(row.documentType as DocumentType, row.id));
}

function typeLabel(documentType: string): string {
  return documentTypeMeta[documentType as DocumentType]?.label ?? documentType;
}

function statusMeta(status: string): { label: string; color: string } {
  return documentStatusMeta[status as DocumentStatus] ?? { label: status, color: 'default' };
}

onMounted(() => {
  void search();
});
</script>

<template>
  <div class="insight-documents-page">
    <AppPageHeader
      description="按单号、日期、申请人、金额等条件检索单据"
      eyebrow="运营分析"
      title="单据检索"
    />

    <a-card size="small" style="margin-bottom: 16px">
      <a-space wrap>
        <a-input
          v-model:value="filters.number"
          allow-clear
          placeholder="单号（如 LX20260801001）"
          style="width: 200px"
        />
        <a-input
          v-model:value="filters.keyword"
          allow-clear
          placeholder="标题关键字"
          style="width: 160px"
        />
        <a-input
          v-model:value="filters.applicant"
          allow-clear
          placeholder="申请人"
          style="width: 120px"
        />
        <a-select
          v-model:value="filters.documentType"
          :options="TRACKED_DOCUMENT_TYPE_OPTIONS"
          allow-clear
          placeholder="单据类型"
          style="width: 170px"
        />
        <a-select
          v-model:value="filters.status"
          :options="DOCUMENT_STATUS_OPTIONS"
          allow-clear
          placeholder="状态"
          style="width: 120px"
        />
        <a-range-picker v-model:value="filters.dateRange" value-format="YYYY-MM-DD" />
        <a-input-number
          v-model:value="filters.amountMinYuan"
          :min="0"
          placeholder="金额下限(元)"
          style="width: 140px"
        />
        <a-input-number
          v-model:value="filters.amountMaxYuan"
          :min="0"
          placeholder="金额上限(元)"
          style="width: 140px"
        />
        <a-button type="primary" @click="search">
          <template #icon><SearchOutlined /></template>
          查询
        </a-button>
        <a-button @click="reset">
          <template #icon><ReloadOutlined /></template>
          重置
        </a-button>
      </a-space>
    </a-card>

    <a-table
      :columns="columns"
      :custom-row="(record: DocumentSearchRow) => ({ onClick: () => openDocument(record) })"
      :data-source="rows"
      :loading="loading"
      :pagination="{ pageSize: 20, showTotal: (total: number) => `共 ${total} 条` }"
      row-class-name="insight-documents-page__row"
      row-key="id"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'documentNo'">
          {{ (record as DocumentSearchRow).documentNo ?? '未提交' }}
        </template>
        <template v-else-if="column.key === 'documentType'">
          {{ typeLabel((record as DocumentSearchRow).documentType) }}
        </template>
        <template v-else-if="column.key === 'amount'">
          {{
            (record as DocumentSearchRow).amountCents !== null
              ? formatYuan((record as DocumentSearchRow).amountCents!)
              : '-'
          }}
        </template>
        <template v-else-if="column.key === 'status'">
          <a-tag :color="statusMeta((record as DocumentSearchRow).status).color">
            {{ statusMeta((record as DocumentSearchRow).status).label }}
          </a-tag>
        </template>
        <template v-else-if="column.key === 'createdAt'">
          {{ new Date((record as DocumentSearchRow).createdAt).toLocaleString() }}
        </template>
      </template>
    </a-table>
  </div>
</template>

<style scoped>
.insight-documents-page :deep(.insight-documents-page__row) {
  cursor: pointer;
}
</style>
