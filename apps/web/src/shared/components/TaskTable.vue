<script setup lang="ts">
import { View } from '@element-plus/icons-vue';
import type { ApprovalTaskSummary, DocumentType } from '@oa/contracts';
import { computed, ref, watch } from 'vue';
import UiDataList from '../../ui/UiDataList.vue';
import UiPagination from '../../ui/UiPagination.vue';
import { documentTypeMeta, workflowNodeLabel } from '../document';
import { formatDateTime } from '../format';

const props = defineProps<{ tasks: ApprovalTaskSummary[]; loading?: boolean; actionLabel?: string }>();
const emit = defineEmits<{ open: [task: ApprovalTaskSummary] }>();
const page = ref(1);
const pageSize = ref(10);
const pagedTasks = computed(() => props.tasks.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const columns = [
  { key: 'documentTitle', label: '单据', minWidth: 220 },
  { key: 'documentType', label: '类型', width: 160 },
  { key: 'assigneeRole', label: '办理节点', width: 150 },
  { key: 'createdAt', label: '接收时间', width: 180 },
  { key: 'actions', label: '操作', width: 86 },
];
watch(() => props.tasks, () => { page.value = 1; });
watch(() => [props.tasks.length, pageSize.value], () => {
  page.value = Math.min(page.value, Math.max(1, Math.ceil(props.tasks.length / pageSize.value)));
});
function documentTypeLabel(type: DocumentType): string { return documentTypeMeta[type]?.label ?? type; }
</script>

<template>
  <div class="task-table">
    <UiDataList :rows="pagedTasks" :columns="columns" :loading="loading" empty-text="暂无待办任务" @row-click="emit('open', $event)">
      <template #cell-documentTitle="{ row }">
        <button class="task-table__link" type="button" @click.stop="emit('open', row)">{{ row.documentTitle }}</button>
      </template>
      <template #cell-documentType="{ row }">{{ documentTypeLabel(row.documentType) }}</template>
      <template #cell-assigneeRole="{ row }">{{ workflowNodeLabel(row.assigneeRole) }}</template>
      <template #cell-createdAt="{ row }">{{ formatDateTime(row.createdAt) }}</template>
      <template #mobile-title="{ row }">
        <button class="task-table__link" type="button" @click.stop="emit('open', row)">{{ row.documentTitle }}</button>
      </template>
      <template #actions="{ row }">
        <el-button :icon="View" text :aria-label="`${actionLabel ?? '办理'}${row.documentTitle}`" :title="actionLabel ?? '办理任务'" @click.stop="emit('open', row)" />
      </template>
    </UiDataList>
    <UiPagination v-if="tasks.length > 0" v-model:page="page" v-model:page-size="pageSize" :total="tasks.length" />
  </div>
</template>

<style scoped>
.task-table { min-width: 0; }
.task-table__link { max-width: 100%; padding: 0; border: 0; background: none; color: var(--color-primary); font: inherit; font-weight: 600; text-align: left; overflow-wrap: anywhere; cursor: pointer; }
.task-table__link:hover, .task-table__link:focus-visible { text-decoration: underline; text-underline-offset: 3px; }
</style>
