<script setup lang="ts">
import { FileSearchOutlined } from '@ant-design/icons-vue';
import type { ApprovalTaskSummary, DocumentType } from '@oa/contracts';
import { documentTypeMeta, workflowNodeLabel } from '../document';
import { formatDateTime } from '../format';

defineProps<{
  tasks: ApprovalTaskSummary[];
  loading?: boolean;
  actionLabel?: string;
}>();

const emit = defineEmits<{ open: [task: ApprovalTaskSummary] }>();

function documentTypeLabel(documentType: DocumentType): string {
  return documentTypeMeta[documentType].label;
}

const columns = [
  { title: '单据', dataIndex: 'documentTitle', key: 'documentTitle' },
  { title: '类型', dataIndex: 'documentType', key: 'documentType', width: 160 },
  { title: '办理节点', dataIndex: 'assigneeRole', key: 'assigneeRole', width: 140 },
  { title: '接收时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  { title: '操作', key: 'actions', width: 100 },
];
</script>

<template>
  <div class="task-table task-table--desktop">
    <a-table
      :columns="columns"
      :data-source="tasks"
      :loading="loading"
      :pagination="{ pageSize: 10, showTotal: (total: number) => `共 ${total} 条` }"
      row-key="id"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'documentTitle'">
          <button class="table-link" type="button" @click="emit('open', record)">
            {{ record.documentTitle }}
          </button>
        </template>
        <template v-else-if="column.key === 'documentType'">
          {{ documentTypeLabel(record.documentType) }}
        </template>
        <template v-else-if="column.key === 'assigneeRole'">
          {{ workflowNodeLabel(record.assigneeRole) }}
        </template>
        <template v-else-if="column.key === 'createdAt'">
          {{ formatDateTime(record.createdAt) }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-button type="link" @click="emit('open', record)">
            <template #icon><FileSearchOutlined /></template>
            {{ actionLabel ?? '办理' }}
          </a-button>
        </template>
      </template>
    </a-table>
  </div>

  <div class="task-cards task-table--mobile">
    <a-empty v-if="!loading && tasks.length === 0" />
    <article
      v-for="task in tasks"
      :key="task.id"
      class="task-card"
      role="button"
      tabindex="0"
      @click="emit('open', task)"
      @keydown.enter="emit('open', task)"
    >
      <strong>{{ task.documentTitle }}</strong>
      <span>{{ documentTypeLabel(task.documentType) }}</span>
      <small>
        {{ workflowNodeLabel(task.assigneeRole) }} ·
        {{ formatDateTime(task.createdAt) }}
      </small>
    </article>
  </div>
</template>
