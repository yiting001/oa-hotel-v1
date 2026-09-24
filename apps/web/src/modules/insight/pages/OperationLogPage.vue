<script setup lang="ts">
import { DocumentCopy, Refresh, Search } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { apiRequest } from '../../../shared/api';
import AppPageHeader from '../../../shared/components/AppPageHeader.vue';
import { approvalActionLabels } from '../../../shared/document';
import { formatDateTime } from '../../../shared/format';
import UiDataList from '../../../ui/UiDataList.vue';
import UiDialog from '../../../ui/UiDialog.vue';
import UiPagination from '../../../ui/UiPagination.vue';
import { useLayoutMode } from '../../../ui/useLayoutMode';
import { INSIGHT_API } from '../insight.config';
import type { OperationLogRow, RequestLogRow } from '../insight.types';

const { isCompact } = useLayoutMode();
const activeTab = ref<'business' | 'request'>('business');
const filterOpen = ref(false);
const loading = ref(false);
const rows = ref<OperationLogRow[]>([]);
const page = ref(1);
const pageSize = ref(20);
const visibleRows = computed(() => rows.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const filters = reactive({ number: '', actor: '', action: undefined as string | undefined,
  dateRange: null as [string, string] | null });
const actionOptions = [
  { value: 'SUBMIT', label: '提交审批' }, { value: 'APPROVE', label: '同意' }, { value: 'RETURN', label: '退回' },
];
const columns = [
  { key: 'createdAt', label: '操作时间', minWidth: 168 },
  { key: 'actorName', label: '操作人', minWidth: 110 },
  { key: 'action', label: '操作', width: 112 },
  { key: 'documentNo', label: '单据编号', minWidth: 150 },
  { key: 'documentTitle', label: '单据标题', minWidth: 230 },
  { key: 'comment', label: '意见', minWidth: 180 },
];

async function search(): Promise<void> {
  loading.value = true;
  try {
    const params = new URLSearchParams();
    if (filters.number.trim()) params.set('number', filters.number.trim());
    if (filters.actor.trim()) params.set('actor', filters.actor.trim());
    if (filters.action) params.set('action', filters.action);
    if (filters.dateRange?.[0]) params.set('dateFrom', filters.dateRange[0]);
    if (filters.dateRange?.[1]) params.set('dateTo', filters.dateRange[1]);
    const query = params.toString();
    rows.value = await apiRequest<OperationLogRow[]>(query ? `${INSIGHT_API.operationLogs}?${query}` : INSIGHT_API.operationLogs);
    page.value = 1;
    filterOpen.value = false;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '操作日志加载失败');
  } finally { loading.value = false; }
}
function reset(): void {
  Object.assign(filters, { number: '', actor: '', action: undefined, dateRange: null });
  void search();
}

const requestLoading = ref(false);
const requestRows = ref<RequestLogRow[]>([]);
const requestDetail = ref<RequestLogRow | null>(null);
const requestPage = ref(1);
const requestPageSize = ref(20);
const visibleRequests = computed(() => requestRows.value.slice((requestPage.value - 1) * requestPageSize.value, requestPage.value * requestPageSize.value));
const requestFilters = reactive({ traceId: '', path: '', method: undefined as string | undefined,
  actor: '', status: undefined as 'success' | 'error' | undefined,
  dateRange: null as [string, string] | null });
const methodOptions = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((value) => ({ value, label: value }));
const statusOptions = [
  { value: 'success', label: '成功（<400）' }, { value: 'error', label: '失败（≥400）' },
];
const requestColumns = [
  { key: 'createdAt', label: '时间', minWidth: 168 },
  { key: 'traceId', label: 'TraceId', minWidth: 146 },
  { key: 'method', label: '方法', width: 86 },
  { key: 'path', label: '路径', minWidth: 220 },
  { key: 'statusCode', label: '状态码', width: 90 },
  { key: 'durationMs', label: '耗时', width: 90 },
  { key: 'actorName', label: '操作人', minWidth: 110 },
  { key: 'errorMessage', label: '错误信息', minWidth: 180 },
  { key: 'actions', label: '操作', width: 82 },
];

async function searchRequests(): Promise<void> {
  requestLoading.value = true;
  try {
    const params = new URLSearchParams();
    if (requestFilters.traceId.trim()) params.set('traceId', requestFilters.traceId.trim());
    if (requestFilters.path.trim()) params.set('path', requestFilters.path.trim());
    if (requestFilters.method) params.set('method', requestFilters.method);
    if (requestFilters.actor.trim()) params.set('actor', requestFilters.actor.trim());
    if (requestFilters.status) params.set('status', requestFilters.status);
    if (requestFilters.dateRange?.[0]) params.set('dateFrom', requestFilters.dateRange[0]);
    if (requestFilters.dateRange?.[1]) params.set('dateTo', requestFilters.dateRange[1]);
    const query = params.toString();
    requestRows.value = await apiRequest<RequestLogRow[]>(query ? `${INSIGHT_API.requestLogs}?${query}` : INSIGHT_API.requestLogs);
    requestPage.value = 1;
    filterOpen.value = false;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '请求日志加载失败');
  } finally { requestLoading.value = false; }
}
function resetRequests(): void {
  Object.assign(requestFilters, { traceId: '', path: '', method: undefined, actor: '', status: undefined, dateRange: null });
  void searchRequests();
}
function formatJson(text: string | null): string {
  if (!text) return '（空）';
  try { return JSON.stringify(JSON.parse(text), null, 2); } catch { return text; }
}
function onTabChange(key: string | number): void {
  if (key === 'request' && requestRows.value.length === 0) void searchRequests();
}
function changePage(next: { page: number; pageSize: number }): void {
  page.value = next.page; pageSize.value = next.pageSize;
}
function changeRequestPage(next: { page: number; pageSize: number }): void {
  requestPage.value = next.page; requestPageSize.value = next.pageSize;
}
async function copyTraceId(value: string): Promise<void> {
  try { await navigator.clipboard.writeText(value); ElMessage.success('TraceId 已复制'); }
  catch { ElMessage.warning('复制失败'); }
}
onMounted(() => void search());
</script>

<template>
  <main class="ui-page insight-logs-page">
    <AppPageHeader eyebrow="系统设置" title="操作日志" />
    <el-tabs v-model="activeTab" @tab-change="onTabChange">
      <el-tab-pane label="业务操作日志" name="business">
        <div class="ui-toolbar insight-log-toolbar">
          <el-input v-model="filters.number" clearable placeholder="单据编号" aria-label="单据编号" @keyup.enter="search" />
          <el-input v-model="filters.actor" clearable placeholder="操作人" aria-label="操作人" @keyup.enter="search" />
          <template v-if="!isCompact">
            <el-select v-model="filters.action" clearable placeholder="操作类型" aria-label="操作类型"><el-option v-for="option in actionOptions" :key="option.value" :label="option.label" :value="option.value" /></el-select>
            <el-date-picker v-model="filters.dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" range-separator="至" />
          </template>
          <el-button v-if="isCompact" @click="filterOpen = true">筛选</el-button>
          <div class="ui-toolbar__end">
            <el-button type="primary" :icon="Search" @click="search">查询</el-button>
            <el-button :icon="Refresh" @click="reset">重置</el-button>
          </div>
        </div>
        <UiDataList :rows="visibleRows" :columns="columns" :loading="loading" empty-text="暂无操作记录">
          <template #cell-createdAt="{ row }">{{ formatDateTime(row.createdAt) }}</template>
          <template #cell-action="{ row }"><el-tag effect="plain" size="small">{{ approvalActionLabels[row.action] ?? row.action }}</el-tag></template>
          <template #cell-documentNo="{ row }">{{ row.documentNo ?? '-' }}</template>
          <template #mobile-title="{ row }">{{ row.documentTitle }}</template>
          <template #mobile-summary="{ row }"><span class="ui-text-muted">{{ row.documentNo ?? '-' }} · {{ approvalActionLabels[row.action] ?? row.action }}<br />{{ row.actorName }} · {{ formatDateTime(row.createdAt) }}<br />{{ row.comment }}</span></template>
        </UiDataList>
        <UiPagination v-model:page="page" v-model:page-size="pageSize" :total="rows.length" @change="changePage" />
      </el-tab-pane>
      <el-tab-pane label="请求日志" name="request">
        <div class="ui-toolbar insight-log-toolbar">
          <el-input v-model="requestFilters.traceId" clearable placeholder="TraceId" aria-label="TraceId" @keyup.enter="searchRequests" />
          <el-input v-model="requestFilters.path" clearable placeholder="请求路径" aria-label="请求路径" @keyup.enter="searchRequests" />
          <template v-if="!isCompact">
            <el-select v-model="requestFilters.method" clearable placeholder="方法" aria-label="方法"><el-option v-for="option in methodOptions" :key="option.value" :label="option.label" :value="option.value" /></el-select>
            <el-select v-model="requestFilters.status" clearable placeholder="结果" aria-label="结果"><el-option v-for="option in statusOptions" :key="option.value" :label="option.label" :value="option.value" /></el-select>
            <el-input v-model="requestFilters.actor" clearable placeholder="操作人" aria-label="操作人" @keyup.enter="searchRequests" />
            <el-date-picker v-model="requestFilters.dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" range-separator="至" />
          </template>
          <el-button v-if="isCompact" @click="filterOpen = true">筛选</el-button>
          <div class="ui-toolbar__end">
            <el-button type="primary" :icon="Search" @click="searchRequests">查询</el-button>
            <el-button :icon="Refresh" @click="resetRequests">重置</el-button>
          </div>
        </div>
        <UiDataList :rows="visibleRequests" :columns="requestColumns" :loading="requestLoading" empty-text="暂无请求记录" @row-click="requestDetail = $event">
          <template #cell-createdAt="{ row }">{{ formatDateTime(row.createdAt) }}</template>
          <template #cell-traceId="{ row }"><span class="insight-trace-id" :title="row.traceId">{{ row.traceId.slice(0, 8) }}…</span></template>
          <template #cell-method="{ row }"><el-tag effect="plain" size="small">{{ row.method }}</el-tag></template>
          <template #cell-statusCode="{ row }"><el-tag :type="row.statusCode >= 400 ? 'danger' : 'info'" effect="plain" size="small">{{ row.statusCode }}</el-tag></template>
          <template #cell-durationMs="{ row }">{{ row.durationMs }} ms</template>
          <template #cell-actorName="{ row }">{{ row.actorName ?? '-' }}</template>
          <template #cell-errorMessage="{ row }">{{ row.errorMessage ?? '-' }}</template>
          <template #mobile-title="{ row }">{{ row.method }} {{ row.path }}</template>
          <template #mobile-summary="{ row }"><span class="ui-text-muted">{{ row.statusCode }} · {{ row.durationMs }} ms · {{ formatDateTime(row.createdAt) }}<br />{{ row.traceId }}<br />{{ row.errorMessage ?? row.actorName ?? '-' }}</span></template>
          <template #actions="{ row }"><el-button link @click="requestDetail = row">详情</el-button></template>
        </UiDataList>
        <UiPagination v-model:page="requestPage" v-model:page-size="requestPageSize" :total="requestRows.length" @change="changeRequestPage" />
      </el-tab-pane>
    </el-tabs>

    <UiDialog v-model="filterOpen" :title="activeTab === 'business' ? '筛选操作' : '筛选请求'">
      <div v-if="activeTab === 'business'" class="ui-filter-grid insight-log-filter">
        <el-select v-model="filters.action" clearable placeholder="操作类型" aria-label="操作类型"><el-option v-for="option in actionOptions" :key="option.value" :label="option.label" :value="option.value" /></el-select>
        <el-date-picker v-model="filters.dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" range-separator="至" />
      </div>
      <div v-else class="ui-filter-grid insight-log-filter">
        <el-select v-model="requestFilters.method" clearable placeholder="方法" aria-label="方法"><el-option v-for="option in methodOptions" :key="option.value" :label="option.label" :value="option.value" /></el-select>
        <el-select v-model="requestFilters.status" clearable placeholder="结果" aria-label="结果"><el-option v-for="option in statusOptions" :key="option.value" :label="option.label" :value="option.value" /></el-select>
        <el-input v-model="requestFilters.actor" clearable placeholder="操作人" aria-label="操作人" />
        <el-date-picker v-model="requestFilters.dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" range-separator="至" />
      </div>
      <template #footer><el-button @click="activeTab === 'business' ? reset() : resetRequests()">重置</el-button><el-button type="primary" @click="activeTab === 'business' ? search() : searchRequests()">查询</el-button></template>
    </UiDialog>
    <UiDialog :model-value="requestDetail !== null" title="请求详情" @update:model-value="requestDetail = null">
      <template v-if="requestDetail">
        <dl class="insight-request-facts">
          <div><dt>TraceId</dt><dd>{{ requestDetail.traceId }} <el-button :icon="DocumentCopy" link aria-label="复制 TraceId" @click="copyTraceId(requestDetail.traceId)" /></dd></div>
          <div><dt>时间</dt><dd>{{ formatDateTime(requestDetail.createdAt) }}</dd></div>
          <div><dt>请求</dt><dd>{{ requestDetail.method }} {{ requestDetail.path }}{{ requestDetail.query ? `?${requestDetail.query}` : '' }}</dd></div>
          <div><dt>状态码 / 耗时</dt><dd>{{ requestDetail.statusCode }} / {{ requestDetail.durationMs }} ms</dd></div>
          <div><dt>操作人</dt><dd>{{ requestDetail.actorName ?? '-' }}</dd></div>
        </dl>
        <h3 class="insight-detail-heading">入参</h3><pre class="insight-request-json">{{ formatJson(requestDetail.requestBody) }}</pre>
        <h3 class="insight-detail-heading">出参</h3><pre class="insight-request-json">{{ formatJson(requestDetail.responseBody) }}</pre>
        <template v-if="requestDetail.errorMessage || requestDetail.errorStack">
          <h3 class="insight-detail-heading">错误栈</h3><pre class="insight-request-json insight-request-json--error">{{ requestDetail.errorStack ?? requestDetail.errorMessage }}</pre>
        </template>
      </template>
    </UiDialog>
  </main>
</template>

<style scoped>
.insight-log-toolbar { margin-bottom: 16px; }
.insight-trace-id { font-family: ui-monospace, monospace; }
.insight-request-facts { margin: 0; }
.insight-request-facts > div { display: grid; grid-template-columns: 130px minmax(0, 1fr); padding: 10px 0; border-bottom: 1px solid var(--color-border); }
.insight-request-facts dt { color: var(--color-text-secondary); }
.insight-request-facts dd { margin: 0; overflow-wrap: anywhere; }
.insight-detail-heading { margin: 20px 0 8px; font-size: 14px; }
.insight-request-json { max-height: 260px; overflow: auto; padding: 12px; background: var(--color-fill-subtle); font-size: 12px; white-space: pre-wrap; overflow-wrap: anywhere; }
.insight-request-json--error { color: var(--color-error-text); background: var(--color-error-bg); }
@media (max-width: 767px) {
  .insight-request-facts > div { grid-template-columns: 1fr; gap: 4px; }
}
</style>
