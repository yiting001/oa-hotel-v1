<script setup lang="ts">
import type { ApprovalTaskSummary } from '@oa/contracts';
import { computed, ref } from 'vue';
import { apiRequest, requestId } from '../shared/api';
import { useSessionStore } from '../shared/session';

const session = useSessionStore();
const tasks = ref<ApprovalTaskSummary[]>([]);
const loading = ref(false);

async function loadTasks(): Promise<void> {
  loading.value = true;
  try {
    tasks.value = await apiRequest<ApprovalTaskSummary[]>('/workflow/tasks');
  } finally {
    loading.value = false;
  }
}

async function approve(task: ApprovalTaskSummary): Promise<void> {
  await apiRequest(`/workflow/tasks/${task.id}/approve`, {
    method: 'POST',
    body: { requestId: requestId(), comment: '同意' },
  });
  await loadTasks();
}

async function returnTask(task: ApprovalTaskSummary): Promise<void> {
  await apiRequest(`/workflow/tasks/${task.id}/return`, {
    method: 'POST',
    body: { requestId: requestId(), comment: '请补充资料' },
  });
  await loadTasks();
}

const columns = computed(() => [
  { title: '单据', dataIndex: 'documentTitle' },
  { title: '类型', dataIndex: 'documentType' },
  { title: '角色', dataIndex: 'assigneeRole' },
  { title: '操作', key: 'actions' },
]);

loadTasks();
</script>

<template>
  <div class="page-card">
    <a-page-header title="个人工作台" sub-title="待办、审批和角色切换验证入口" />
    <a-alert
      v-if="session.user"
      type="info"
      show-icon
      :message="`当前用户：${session.user.displayName} / ${session.user.roleCodes.join('、')}`"
    />
    <a-space style="margin: 16px 0">
      <a-button type="primary" @click="loadTasks">刷新待办</a-button>
      <a-button href="/contract">发起合同支出</a-button>
      <a-button href="/seal">发起行政印章</a-button>
      <a-button href="/supply">发起物资单据</a-button>
    </a-space>
    <a-table :columns="columns" :data-source="tasks" :loading="loading" row-key="id">
      <template #bodyCell="{ column, record }">
        <a-space v-if="column.key === 'actions'">
          <a-button type="primary" size="small" @click="approve(record as ApprovalTaskSummary)">
            同意
          </a-button>
          <a-button size="small" @click="returnTask(record as ApprovalTaskSummary)">退回</a-button>
        </a-space>
      </template>
    </a-table>
  </div>
</template>
