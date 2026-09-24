<script setup lang="ts">
import { computed } from 'vue';
import { useLayoutMode } from '../../ui/useLayoutMode';

export interface SummaryItem {
  label: string;
  value: string | number | null | undefined;
  span?: number;
}
const props = defineProps<{ items: SummaryItem[]; columns?: number }>();
const { isCompact } = useLayoutMode();
const columnCount = computed(() => isCompact.value ? 1 : Math.max(1, props.columns ?? 2));
</script>

<template>
  <dl class="key-value-summary ui-summary" :style="{ '--summary-columns': columnCount }">
    <div v-for="(item, index) in items" :key="`${item.label}-${index}`" class="key-value-summary__item" :style="{ gridColumn: `span ${Math.min(Math.max(1, item.span ?? 1), columnCount)}` }">
      <dt>{{ item.label }}</dt>
      <dd>{{ item.value ?? '-' }}</dd>
    </div>
  </dl>
</template>

<style scoped>
.key-value-summary { display: grid; grid-template-columns: repeat(var(--summary-columns), minmax(0, 1fr)); gap: 0; margin: 0; border-top: 1px solid var(--color-border); }
.key-value-summary__item { min-width: 0; padding: 12px 16px 12px 0; border-bottom: 1px solid var(--color-border); }
.key-value-summary dt { margin-bottom: 5px; color: var(--color-text-secondary); font-size: 12px; }
.key-value-summary dd { margin: 0; color: var(--color-text); font-size: 14px; line-height: 1.55; overflow-wrap: anywhere; white-space: pre-wrap; }
</style>
