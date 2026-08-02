<script setup lang="ts">
export interface SummaryItem {
  label: string;
  value: string | number | null | undefined;
  span?: number;
}

defineProps<{ items: SummaryItem[]; columns?: number }>();
</script>

<template>
  <a-descriptions bordered :column="columns ?? 2" size="small">
    <a-descriptions-item
      v-for="item in items"
      :key="item.label"
      :label="item.label"
      :span="item.span"
    >
      {{ item.value ?? '-' }}
    </a-descriptions-item>
  </a-descriptions>
</template>
