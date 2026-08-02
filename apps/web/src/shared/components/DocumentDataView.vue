<script setup lang="ts">
import { computed } from 'vue';
import { fieldLabels, formatFieldValue, hiddenDetailFields } from '../field';
import AttachmentField from './AttachmentField.vue';
import KeyValueSummary, { type SummaryItem } from './KeyValueSummary.vue';

const props = defineProps<{ data: Record<string, unknown> }>();

const summaryItems = computed<SummaryItem[]>(() =>
  Object.entries(props.data)
    .filter(([key, value]) => !hiddenDetailFields.has(key) && !isObjectValue(value))
    .map(([key, value]) => ({
      label: fieldLabels[key] ?? key,
      value: formatFieldValue(key, value),
      span: [
        'content',
        'contentReason',
        'paymentReason',
        'executionNote',
        'exceptionNote',
      ].includes(key)
        ? 2
        : 1,
    })),
);

const items = computed<Record<string, unknown>[]>(() =>
  Array.isArray(props.data.items) ? (props.data.items as Record<string, unknown>[]) : [],
);

const itemKeys = computed(() => {
  const keys = new Set<string>();
  items.value.forEach((item) => Object.keys(item).forEach((key) => keys.add(key)));
  return [...keys].filter((key) => !['materialItemId'].includes(key));
});

const attachments = computed(() =>
  Array.isArray(props.data.attachments) ? (props.data.attachments as string[]) : [],
);

function isObjectValue(value: unknown): boolean {
  return typeof value === 'object' && value !== null;
}

function detailRowKey(item: Record<string, unknown>, index?: number): string {
  return String(item.materialItemId ?? item.itemCode ?? index ?? 'item');
}
</script>

<template>
  <div class="document-data-view">
    <KeyValueSummary :items="summaryItems" />

    <section v-if="items.length" class="document-detail-section">
      <h3>明细</h3>
      <div class="detail-items--desktop">
        <a-table :data-source="items" :pagination="false" :row-key="detailRowKey" size="small">
          <a-table-column
            v-for="key in itemKeys"
            :key="key"
            :data-index="key"
            :title="fieldLabels[key] ?? key"
          >
            <template #default="{ text }">{{ formatFieldValue(key, text) }}</template>
          </a-table-column>
        </a-table>
      </div>
      <div class="detail-items--mobile">
        <a-descriptions
          v-for="(item, index) in items"
          :key="index"
          :column="1"
          bordered
          size="small"
        >
          <a-descriptions-item v-for="key in itemKeys" :key="key" :label="fieldLabels[key] ?? key">
            {{ formatFieldValue(key, item[key]) }}
          </a-descriptions-item>
        </a-descriptions>
      </div>
    </section>

    <section v-if="attachments.length" class="document-detail-section">
      <h3>附件清单</h3>
      <AttachmentField :model-value="attachments" readonly />
    </section>
  </div>
</template>
