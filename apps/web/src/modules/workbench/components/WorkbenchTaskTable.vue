<script setup lang="ts">
import { View } from '@element-plus/icons-vue';
import type { DocumentType, WorkbenchItem } from '@oa/contracts';
import { computed } from 'vue';
import UiDataList, { type DataColumn } from '../../../ui/UiDataList.vue';
import { documentTypeMeta, workflowNodeLabel } from '../../../shared/document';
import { formatDateTime } from '../../../shared/format';

const props = withDefaults(
  defineProps<{
    tasks: WorkbenchItem[];
    loading?: boolean;
    actionLabel?: string;
    selectable?: boolean;
    selectedIds?: string[];
  }>(),
  { loading: false, actionLabel: '办理', selectable: false, selectedIds: () => [] },
);
const emit = defineEmits<{
  open: [task: WorkbenchItem];
  'selection-change': [tasks: WorkbenchItem[]];
}>();

const columns: DataColumn[] = [
  { key: 'documentTitle', label: '单据', minWidth: 240 },
  { key: 'documentType', label: '流程类型', minWidth: 150 },
  { key: 'processNodeName', label: '当前节点', minWidth: 150 },
  { key: 'applicant', label: '发起人 / 部门', minWidth: 170 },
  { key: 'updatedAt', label: '更新时间', minWidth: 170 },
  { key: 'actions', label: '操作', width: 108 },
];

const selectedKeys = computed(() => props.selectedIds ?? []);

function typeLabel(task: WorkbenchItem): string {
  return documentTypeMeta[task.documentType as DocumentType]?.label ?? task.documentType;
}

function nodeLabel(task: WorkbenchItem): string {
  if (task.processNodeName) return task.processNodeName;
  if (task.assigneeRole) return workflowNodeLabel(task.assigneeRole);
  return task.currentStep === null || task.currentStep === undefined
    ? '—'
    : `第 ${task.currentStep + 1} 步`;
}
</script>

<template>
  <UiDataList
    :columns="columns"
    :loading="loading"
    :rows="tasks"
    :selectable="selectable"
    :selected-keys="selectedKeys"
    :selection-test-id="(row) => `workbench-task-select-${row.id}`"
    empty-text="暂无待办任务"
    test-id="workbench-task-table"
    @row-click="emit('open', $event)"
    @selection-change="emit('selection-change', $event)"
  >
    <template #cell-documentTitle="{ row }">
      <button
        :data-testid="`workbench-task-open-${row.id}`"
        class="task-link"
        type="button"
        @click.stop="emit('open', row)"
      >
        {{ row.documentTitle }}
      </button>
    </template>
    <template #cell-documentType="{ row }">{{ typeLabel(row) }}</template>
    <template #cell-processNodeName="{ row }">{{ nodeLabel(row) }}</template>
    <template #cell-applicant="{ row }">{{ row.applicantName }} / {{ row.departmentName }}</template>
    <template #cell-updatedAt="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
    <template #mobile-title="{ row }">
      <button
        :data-testid="`workbench-task-open-${row.id}`"
        class="task-link"
        type="button"
        @click.stop="emit('open', row)"
      >
        {{ row.documentTitle }}
      </button>
    </template>
    <template #mobile-summary="{ row }">
      <dl class="ui-record__facts">
        <div><dt>流程类型</dt><dd>{{ typeLabel(row) }}</dd></div>
        <div><dt>当前节点</dt><dd>{{ nodeLabel(row) }}</dd></div>
        <div><dt>发起人</dt><dd>{{ row.applicantName }}</dd></div>
        <div><dt>部门</dt><dd>{{ row.departmentName }}</dd></div>
        <div><dt>更新时间</dt><dd>{{ formatDateTime(row.updatedAt) }}</dd></div>
      </dl>
    </template>
    <template #actions="{ row }">
      <el-button :icon="View" link @click.stop="emit('open', row)">{{ actionLabel }}</el-button>
    </template>
  </UiDataList>
</template>

<style scoped>
.task-link {
  max-width: 100%;
  padding: 0;
  color: var(--color-text);
  background: none;
  border: 0;
  font: inherit;
  font-weight: 600;
  text-align: left;
  overflow-wrap: anywhere;
  cursor: pointer;
}
.task-link:hover { text-decoration: underline; text-underline-offset: 3px; }
</style>
