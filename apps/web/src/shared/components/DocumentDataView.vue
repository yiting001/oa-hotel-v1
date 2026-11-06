<script setup lang="ts">
import type { DocumentAttachmentItem } from '@oa/contracts';
import { computed } from 'vue';
import {
  fieldLabels,
  formatFieldValue,
  hasDetailValue,
  hiddenDetailFields,
  hiddenDetailFieldsByType,
  hiddenItemFields,
  hiddenItemFieldsByType,
} from '../field';
import UiDataList from '../../ui/UiDataList.vue';
import AttachmentUploadField from './AttachmentUploadField.vue';
import KeyValueSummary, { type SummaryItem } from './KeyValueSummary.vue';

const props = defineProps<{ data: Record<string, unknown>; documentType?: string }>();
const typeHiddenFields = computed(
  () => new Set(hiddenDetailFieldsByType[props.documentType ?? ''] ?? []),
);
const summaryItems = computed<SummaryItem[]>(() =>
  Object.entries(props.data)
    .filter(
      ([key, value]) =>
        !hiddenDetailFields.has(key) &&
        !typeHiddenFields.value.has(key) &&
        !isObjectValue(value) &&
        hasDetailValue(value),
    )
    .map(([key, value]) => ({
      label: fieldLabels[key] ?? key,
      value: formatFieldValue(key, value),
      span: ['content', 'contentReason', 'paymentReason', 'executionNote', 'exceptionNote'].includes(key) ? 2 : 1,
    })),
);
const items = computed<Record<string, unknown>[]>(() =>
  Array.isArray(props.data.items) ? props.data.items as Record<string, unknown>[] : [],
);
const itemKeys = computed(() => {
  const typeHidden = new Set(hiddenItemFieldsByType[props.documentType ?? ''] ?? []);
  return [...new Set(items.value.flatMap((item) => Object.keys(item)))].filter(
    (key) => !hiddenItemFields.has(key) && !typeHidden.has(key),
  );
});
const detailRows = computed(() => items.value.map((item, index) => ({ ...item, _detailRowKey: `${item.materialItemId ?? item.itemCode ?? 'item'}-${index}` })));
// 明细里的 name 用「品名」，与其他单据明细表读法一致
const itemFieldLabels: Record<string, string> = { name: '品名' };
const columns = computed(() =>
  itemKeys.value.map((key) => ({
    key,
    label: itemFieldLabels[key] ?? fieldLabels[key] ?? key,
    minWidth: 130,
  })),
);
const attachments = computed<DocumentAttachmentItem[]>(() =>
  Array.isArray(props.data.attachments)
    ? (props.data.attachments as DocumentAttachmentItem[]).filter((item) =>
        typeof item === 'string' ? item.length > 0 : Boolean(item && item.fileName),
      )
    : [],
);
// 数组（如抄送人）仍按一行文本展示，只有纯对象需要排除
function isObjectValue(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
</script>

<template>
  <div class="document-data-view">
    <KeyValueSummary :items="summaryItems" />
    <section v-if="items.length" class="document-detail-section ui-section">
      <h3>明细</h3>
      <UiDataList :rows="detailRows" :columns="columns" row-key="_detailRowKey" empty-text="暂无明细">
        <template v-for="key in itemKeys" :key="key" #[`cell-${key}`]="{ row }">{{ formatFieldValue(key, (row as Record<string, unknown>)[key]) }}</template>
      </UiDataList>
    </section>
    <section v-if="attachments.length" class="document-detail-section ui-section">
      <h3>附件清单</h3>
      <AttachmentUploadField :model-value="attachments" readonly />
    </section>
  </div>
</template>

<style scoped>
.document-detail-section { margin-top: 26px; padding-top: 18px; border-top: 1px solid var(--color-border, #e1e4e8); }
.document-detail-section h3 { margin: 0 0 12px; font-family: inherit; font-size: 16px; font-weight: 650; letter-spacing: 0; }
</style>
