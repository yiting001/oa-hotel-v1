<script setup lang="ts">
import { View } from '@element-plus/icons-vue';
import type { DocumentSummary, DocumentType } from '@oa/contracts';
import { computed, ref, watch } from 'vue';
import UiDataList from '../../ui/UiDataList.vue';
import UiPagination from '../../ui/UiPagination.vue';
import { documentTypeMeta } from '../document';
import { formatDateTime } from '../format';
import StatusTag from './StatusTag.vue';

const props = defineProps<{ documents: DocumentSummary[]; loading?: boolean }>();
const emit = defineEmits<{ open: [document: DocumentSummary] }>();
const page = ref(1);
const pageSize = ref(10);
const pagedDocuments = computed(() => props.documents.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const columns = [
  { key: 'title', label: '单据', minWidth: 220 },
  { key: 'documentType', label: '类型', width: 160 },
  { key: 'status', label: '状态', width: 110 },
  { key: 'revision', label: '修订', width: 80 },
  { key: 'updatedAt', label: '更新时间', width: 180 },
  { key: 'actions', label: '操作', width: 86 },
];
watch(() => props.documents, () => { page.value = 1; });
watch(() => [props.documents.length, pageSize.value], () => {
  page.value = Math.min(page.value, Math.max(1, Math.ceil(props.documents.length / pageSize.value)));
});
function documentTypeLabel(type: DocumentType): string { return documentTypeMeta[type]?.label ?? type; }
</script>

<template>
  <div class="document-table">
    <UiDataList :rows="pagedDocuments" :columns="columns" :loading="loading" empty-text="暂无符合条件的单据" @row-click="emit('open', $event)">
      <template #cell-title="{ row }">
        <button class="document-table__link" type="button" @click.stop="emit('open', row)">{{ row.title }}</button>
      </template>
      <template #cell-documentType="{ row }">{{ documentTypeLabel(row.documentType) }}</template>
      <template #cell-status="{ row }"><StatusTag :status="row.status" /></template>
      <template #cell-updatedAt="{ row }">{{ formatDateTime(row.updatedAt) }}</template>
      <template #mobile-title="{ row }">
        <button class="document-table__link" type="button" @click.stop="emit('open', row)">{{ row.title }}</button>
      </template>
      <template #actions="{ row }">
        <el-button :icon="View" text :aria-label="`查看${row.title}`" title="查看单据" @click.stop="emit('open', row)" />
      </template>
    </UiDataList>
    <UiPagination v-if="documents.length > 0" v-model:page="page" v-model:page-size="pageSize" :total="documents.length" />
  </div>
</template>

<style scoped>
.document-table { min-width: 0; }
.document-table__link { max-width: 100%; padding: 0; border: 0; background: none; color: var(--color-primary); font: inherit; font-weight: 600; text-align: left; overflow-wrap: anywhere; cursor: pointer; }
.document-table__link:hover, .document-table__link:focus-visible { text-decoration: underline; text-underline-offset: 3px; }
</style>
