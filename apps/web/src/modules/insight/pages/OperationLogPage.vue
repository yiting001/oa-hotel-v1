<script setup lang="ts">
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import { onMounted, reactive, ref } from 'vue';
import { apiRequest } from '../../../shared/api';
import AppPageHeader from '../../../shared/components/AppPageHeader.vue';
import { approvalActionLabels } from '../../../shared/document';
import { formatDateTime } from '../../../shared/format';
import { INSIGHT_API } from '../insight.config';
import type { OperationLogRow, RequestLogRow } from '../insight.types';

const activeTab = ref<'business' | 'request'>('business');

/* ---------- 业务操作日志 ---------- */

const loading = ref(false);
const rows = ref<OperationLogRow[]>([]);

const filters = reactive({
  number: '',
  actor: '',
  action: undefined as string | undefined,
  dateRange: null as [string, string] | null,
});

const actionOptions = [
  { value: 'SUBMIT', label: '提交审批' },
  { value: 'APPROVE', label: '同意' },
  { value: 'RETURN', label: '退回' },
];

const columns = [
  { title: '操作时间', key: 'createdAt' },
  { title: '操作人', dataIndex: 'actorName' },
  { title: '操作', key: 'action' },
  { title: '单据编号', key: 'documentNo' },
  { title: '单据标题', dataIndex: 'documentTitle' },
  { title: '意见', dataIndex: 'comment' },
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
    rows.value = await apiRequest<OperationLogRow[]>(
      query ? `${INSIGHT_API.operationLogs}?${query}` : INSIGHT_API.operationLogs,
    );
  } catch (error) {
    message.error(error instanceof Error ? error.message : '操作日志加载失败');
  } finally {
    loading.value = false;
  }
}

function reset(): void {
  Object.assign(filters, { number: '', actor: '', action: undefined, dateRange: null });
  void search();
}

/* ---------- 请求日志（traceId / 出参入参 / 错误栈） ---------- */

const requestLoading = ref(false);
const requestRows = ref<RequestLogRow[]>([]);
const requestDetail = ref<RequestLogRow | null>(null);

const requestFilters = reactive({
  traceId: '',
  path: '',
  method: undefined as string | undefined,
  actor: '',
  status: undefined as 'success' | 'error' | undefined,
  dateRange: null as [string, string] | null,
});

const methodOptions = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((value) => ({
  value,
  label: value,
}));
const statusOptions = [
  { value: 'success', label: '成功（<400）' },
  { value: 'error', label: '失败（≥400）' },
];

const requestColumns = [
  { title: '时间', key: 'createdAt', width: 170 },
  { title: 'TraceId', key: 'traceId', width: 150 },
  { title: '方法', key: 'method', width: 80 },
  { title: '路径', dataIndex: 'path' },
  { title: '状态码', key: 'statusCode', width: 90 },
  { title: '耗时', key: 'durationMs', width: 90 },
  { title: '操作人', key: 'actorName', width: 120 },
  { title: '错误信息', key: 'errorMessage' },
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
    requestRows.value = await apiRequest<RequestLogRow[]>(
      query ? `${INSIGHT_API.requestLogs}?${query}` : INSIGHT_API.requestLogs,
    );
  } catch (error) {
    message.error(error instanceof Error ? error.message : '请求日志加载失败');
  } finally {
    requestLoading.value = false;
  }
}

function resetRequests(): void {
  Object.assign(requestFilters, {
    traceId: '',
    path: '',
    method: undefined,
    actor: '',
    status: undefined,
    dateRange: null,
  });
  void searchRequests();
}

function formatJson(text: string | null): string {
  if (!text) return '（空）';
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function onTabChange(key: string | number): void {
  if (key === 'request' && requestRows.value.length === 0) void searchRequests();
}

onMounted(() => {
  void search();
});
</script>

<template>
  <div class="insight-logs-page">
    <AppPageHeader
      description="业务单据操作留痕与 API 请求级日志（traceId、出参入参、耗时、错误栈），支持追溯与排查"
      eyebrow="系统设置"
      title="操作日志"
    />

    <a-tabs v-model:active-key="activeTab" @change="onTabChange">
      <a-tab-pane key="business" tab="业务操作日志">
        <a-card size="small" style="margin-bottom: 16px">
          <a-space wrap>
            <a-input
              v-model:value="filters.number"
              allow-clear
              placeholder="单据编号"
              style="width: 200px"
            />
            <a-input
              v-model:value="filters.actor"
              allow-clear
              placeholder="操作人"
              style="width: 140px"
            />
            <a-select
              v-model:value="filters.action"
              :options="actionOptions"
              allow-clear
              placeholder="操作类型"
              style="width: 140px"
            />
            <a-range-picker v-model:value="filters.dateRange" value-format="YYYY-MM-DD" />
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
          :data-source="rows"
          :loading="loading"
          :pagination="{ pageSize: 20, showTotal: (total: number) => `共 ${total} 条` }"
          row-key="id"
          size="middle"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'createdAt'">
              {{ formatDateTime((record as OperationLogRow).createdAt) }}
            </template>
            <template v-else-if="column.key === 'action'">
              <a-tag>{{
                approvalActionLabels[(record as OperationLogRow).action] ??
                (record as OperationLogRow).action
              }}</a-tag>
            </template>
            <template v-else-if="column.key === 'documentNo'">
              {{ (record as OperationLogRow).documentNo ?? '-' }}
            </template>
          </template>
        </a-table>
      </a-tab-pane>

      <a-tab-pane key="request" tab="请求日志">
        <a-card size="small" style="margin-bottom: 16px">
          <a-space wrap>
            <a-input
              v-model:value="requestFilters.traceId"
              allow-clear
              placeholder="TraceId"
              style="width: 200px"
            />
            <a-input
              v-model:value="requestFilters.path"
              allow-clear
              placeholder="请求路径"
              style="width: 200px"
            />
            <a-select
              v-model:value="requestFilters.method"
              :options="methodOptions"
              allow-clear
              placeholder="方法"
              style="width: 110px"
            />
            <a-select
              v-model:value="requestFilters.status"
              :options="statusOptions"
              allow-clear
              placeholder="结果"
              style="width: 140px"
            />
            <a-input
              v-model:value="requestFilters.actor"
              allow-clear
              placeholder="操作人"
              style="width: 140px"
            />
            <a-range-picker v-model:value="requestFilters.dateRange" value-format="YYYY-MM-DD" />
            <a-button type="primary" @click="searchRequests">
              <template #icon><SearchOutlined /></template>
              查询
            </a-button>
            <a-button @click="resetRequests">
              <template #icon><ReloadOutlined /></template>
              重置
            </a-button>
          </a-space>
        </a-card>

        <a-table
          :columns="requestColumns"
          :custom-row="
            (record: RequestLogRow) => ({
              onClick: () => {
                requestDetail = record;
              },
              style: { cursor: 'pointer' },
            })
          "
          :data-source="requestRows"
          :loading="requestLoading"
          :pagination="{ pageSize: 20, showTotal: (total: number) => `共 ${total} 条` }"
          row-key="id"
          size="middle"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'createdAt'">
              {{ formatDateTime((record as RequestLogRow).createdAt) }}
            </template>
            <template v-else-if="column.key === 'traceId'">
              <a-typography-text code copyable :content="(record as RequestLogRow).traceId">
                {{ (record as RequestLogRow).traceId.slice(0, 8) }}…
              </a-typography-text>
            </template>
            <template v-else-if="column.key === 'method'">
              <a-tag>{{ (record as RequestLogRow).method }}</a-tag>
            </template>
            <template v-else-if="column.key === 'statusCode'">
              <a-tag :color="(record as RequestLogRow).statusCode >= 400 ? 'red' : 'green'">
                {{ (record as RequestLogRow).statusCode }}
              </a-tag>
            </template>
            <template v-else-if="column.key === 'durationMs'">
              {{ (record as RequestLogRow).durationMs }} ms
            </template>
            <template v-else-if="column.key === 'actorName'">
              {{ (record as RequestLogRow).actorName ?? '-' }}
            </template>
            <template v-else-if="column.key === 'errorMessage'">
              <a-typography-text v-if="(record as RequestLogRow).errorMessage" type="danger">
                {{ (record as RequestLogRow).errorMessage }}
              </a-typography-text>
              <span v-else>-</span>
            </template>
          </template>
        </a-table>

        <a-drawer
          :open="requestDetail !== null"
          title="请求详情"
          width="640"
          @close="requestDetail = null"
        >
          <template v-if="requestDetail">
            <a-descriptions bordered :column="1" size="small">
              <a-descriptions-item label="TraceId">
                <a-typography-text code copyable>{{ requestDetail.traceId }}</a-typography-text>
              </a-descriptions-item>
              <a-descriptions-item label="时间">
                {{ formatDateTime(requestDetail.createdAt) }}
              </a-descriptions-item>
              <a-descriptions-item label="请求">
                {{ requestDetail.method }} {{ requestDetail.path
                }}{{ requestDetail.query ? `?${requestDetail.query}` : '' }}
              </a-descriptions-item>
              <a-descriptions-item label="状态码 / 耗时">
                {{ requestDetail.statusCode }} / {{ requestDetail.durationMs }} ms
              </a-descriptions-item>
              <a-descriptions-item label="操作人">
                {{ requestDetail.actorName ?? '-' }}
              </a-descriptions-item>
            </a-descriptions>

            <h4 class="request-detail-title">入参</h4>
            <pre class="request-detail-json">{{ formatJson(requestDetail.requestBody) }}</pre>
            <h4 class="request-detail-title">出参</h4>
            <pre class="request-detail-json">{{ formatJson(requestDetail.responseBody) }}</pre>
            <template v-if="requestDetail.errorMessage || requestDetail.errorStack">
              <h4 class="request-detail-title request-detail-title--error">错误栈</h4>
              <pre class="request-detail-json request-detail-json--error">{{
                requestDetail.errorStack ?? requestDetail.errorMessage
              }}</pre>
            </template>
          </template>
        </a-drawer>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<style scoped>
.request-detail-title {
  margin: 16px 0 8px;
}

.request-detail-title--error {
  color: var(--ant-color-error, #cf1322);
}

.request-detail-json {
  max-height: 260px;
  overflow: auto;
  padding: 8px 12px;
  background: var(--color-fill-subtle);
  border-radius: 6px;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
}

.request-detail-json--error {
  background: rgba(229, 106, 106, 0.14);
  color: var(--color-danger);
}
</style>
