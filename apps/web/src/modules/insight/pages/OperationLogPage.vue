<script setup lang="ts">
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import { onMounted, reactive, ref } from 'vue';
import { apiRequest } from '../../../shared/api';
import AppPageHeader from '../../../shared/components/AppPageHeader.vue';
import { approvalActionLabels } from '../../../shared/document';
import { INSIGHT_API } from '../insight.config';
import type { OperationLogRow } from '../insight.types';

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

onMounted(() => {
  void search();
});
</script>

<template>
  <div class="insight-logs-page">
    <AppPageHeader
      description="全部单据的发起、审批、退回操作记录，全程可追溯"
      eyebrow="运营分析"
      title="操作日志"
    />

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
          {{ new Date((record as OperationLogRow).createdAt).toLocaleString() }}
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
  </div>
</template>
