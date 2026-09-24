<script setup lang="ts">
import { computed } from 'vue';
import { fieldLabels, formatFieldValue, hiddenDetailFields } from '../field';
import UiDataList from '../../ui/UiDataList.vue';
import AttachmentField from './AttachmentField.vue';
import KeyValueSummary, { type SummaryItem } from './KeyValueSummary.vue';

const props = defineProps<{ data: Record<string, unknown> }>();
const summaryItems = computed<SummaryItem[]>(() =>
  Object.entries(props.data)
    .filter(([key, value]) => !hiddenDetailFields.has(key) && !isObjectValue(value))
    .map(([key, value]) => ({
      label: fieldLabels[key] ?? key,
      value: formatFieldValue(key, value),
      span: ['content', 'contentReason', 'paymentReason', 'executionNote', 'exceptionNote'].includes(key) ? 2 : 1,
    })),
);
const items = computed<Record<string, unknown>[]>(() =>
  Array.isArray(props.data.items) ? props.data.items as Record<string, unknown>[] : [],
);
const itemKeys = computed(() => [...new Set(items.value.flatMap((item) => Object.keys(item)))].filter((key) => key !== 'materialItemId'));
const detailRows = computed(() => items.value.map((item, index) => ({ ...item, _detailRowKey: `${item.materialItemId ?? item.itemCode ?? 'item'}-${index}` })));
const columns = computed(() => itemKeys.value.map((key) => ({ key, label: fieldLabels[key] ?? key, minWidth: 130 })));
const attachments = computed(() => Array.isArray(props.data.attachments) ? props.data.attachments as string[] : []);
function isObjectValue(value: unknown): boolean { return typeof value === 'object' && value !== null; }
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
      <AttachmentField :model-value="attachments" readonly />
    </section>
  </div>
</template>

<style scoped>
.document-detail-section { margin-top: 26px; padding-top: 18px; border-top: 1px solid var(--color-border, #e1e4e8); }
.document-detail-section h3 { margin: 0 0 12px; font-family: inherit; font-size: 16px; font-weight: 650; letter-spacing: 0; }
</style>
