<script setup lang="ts">
import { View } from '@element-plus/icons-vue';
import type { WorkbenchItem } from '@oa/contracts';
import type { TableInstance } from 'element-plus';
import { nextTick, ref, watch } from 'vue';
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
const table = ref<TableInstance>();
let selectionSyncSequence = 0;
let syncingDesktopSelection = false;

watch(
  () => [props.tasks, props.selectedIds] as const,
  () => void syncDesktopSelection(),
  { deep: true, immediate: true },
);

function nodeLabel(task: WorkbenchItem): string {
  if (task.processNodeName) return task.processNodeName;
  if (task.assigneeRole) return workflowNodeLabel(task.assigneeRole);
  return task.currentStep === null ? '-' : `第 ${task.currentStep + 1} 步`;
}

function typeLabel(task: WorkbenchItem): string {
  return documentTypeMeta[task.documentType].label;
}

function toggleMobileSelection(task: WorkbenchItem, selected: boolean): void {
  const selectedTasks = new Map(
    props.tasks
      .filter((item) => props.selectedIds.includes(item.id))
      .map((item) => [item.id, item]),
  );
  if (selected) selectedTasks.set(task.id, task);
  else selectedTasks.delete(task.id);
  emit('selection-change', [...selectedTasks.values()]);
}

async function syncDesktopSelection(): Promise<void> {
  const sequence = ++selectionSyncSequence;
  await nextTick();
  if (!table.value || sequence !== selectionSyncSequence) return;
  syncingDesktopSelection = true;
  table.value.clearSelection();
  const selectedIds = new Set(props.selectedIds);
  for (const task of props.tasks) {
    if (selectedIds.has(task.id)) table.value.toggleRowSelection(task, true);
  }
  await nextTick();
  if (sequence === selectionSyncSequence) syncingDesktopSelection = false;
}

function handleDesktopSelection(tasks: WorkbenchItem[]): void {
  if (!syncingDesktopSelection) emit('selection-change', tasks);
}
</script>

<template>
  <div class="portal-table portal-table--desktop">
    <el-table
      ref="table"
      v-loading="loading"
      :data="tasks"
      data-testid="workbench-task-table"
      row-key="id"
      @selection-change="handleDesktopSelection"
    >
      <el-table-column v-if="selectable" type="selection" width="48" />
      <el-table-column label="单据" min-width="260">
        <template #default="{ row }">
          <button
            :aria-label="`${actionLabel}${row.documentTitle}`"
            class="portal-table-link"
            :data-testid="`workbench-task-open-${row.id}`"
            type="button"
            @click="emit('open', row)"
          >
            {{ row.documentTitle }}
          </button>
        </template>
      </el-table-column>
      <el-table-column label="流程类型" min-width="150">
        <template #default="{ row }">{{ typeLabel(row) }}</template>
      </el-table-column>
      <el-table-column label="当前节点" min-width="150">
        <template #default="{ row }">{{ nodeLabel(row) }}</template>
      </el-table-column>
      <el-table-column label="发起人 / 部门" min-width="170">
        <template #default="{ row }">{{ row.applicantName }} / {{ row.departmentName }}</template>
      </el-table-column>
      <el-table-column label="更新时间" min-width="170">
        <template #default="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
      </el-table-column>
      <el-table-column align="right" label="操作" width="100">
        <template #default="{ row }">
          <el-button :icon="View" link type="primary" @click="emit('open', row)">{{
            actionLabel
          }}</el-button>
        </template>
      </el-table-column>
      <template #empty><el-empty description="暂无任务" :image-size="64" /></template>
    </el-table>
  </div>
  <div class="portal-card-list portal-table--mobile">
    <el-skeleton v-if="loading" :rows="6" animated />
    <article v-for="task in tasks" v-else :key="task.id" class="workbench-task-card">
      <el-checkbox
        v-if="selectable"
        :aria-label="`选择${task.documentTitle}`"
        :data-testid="`workbench-task-select-${task.id}`"
        :model-value="selectedIds.includes(task.id)"
        @change="toggleMobileSelection(task, Boolean($event))"
      />
      <button
        :aria-label="`${actionLabel}${task.documentTitle}`"
        class="workbench-task-card__open"
        :data-testid="`workbench-task-open-${task.id}`"
        type="button"
        @click="emit('open', task)"
      >
        <span
          ><strong>{{ task.documentTitle }}</strong
          ><el-tag size="small" effect="plain">{{
            documentTypeMeta[task.documentType].label
          }}</el-tag></span
        >
        <small>{{ task.applicantName }} · {{ task.departmentName }}</small>
        <small>{{ nodeLabel(task) }} · {{ formatDateTime(task.updatedAt) }}</small>
      </button>
    </article>
    <el-empty v-if="!loading && tasks.length === 0" description="暂无任务" :image-size="64" />
  </div>
</template>
