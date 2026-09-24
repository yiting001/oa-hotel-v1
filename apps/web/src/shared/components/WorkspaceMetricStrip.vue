<script setup lang="ts">
import { computed } from 'vue';
import { useLayoutMode } from '../../ui/useLayoutMode';

export interface MetricItem {
  key: string;
  label: string;
  value: number | string;
  hint?: string;
}

const props = defineProps<{ label: string; items: ReadonlyArray<MetricItem>; interactive?: boolean }>();
const emit = defineEmits<{ select: [item: MetricItem] }>();
const { isCompact } = useLayoutMode();
const columns = computed(() => (isCompact.value ? Math.min(2, props.items.length) : Math.min(props.items.length, 4)));
</script>

<template>
  <section
    :aria-label="label"
    class="metric-strip"
    :data-compact="isCompact"
    :style="{ '--metric-columns': columns }"
    data-testid="workspace-metric-strip"
  >
    <component
      :is="interactive ? 'button' : 'div'"
      v-for="item in items"
      :key="item.key"
      :type="interactive ? 'button' : undefined"
      class="metric-item"
      data-testid="workspace-metric-item"
      @click="interactive && emit('select', item)"
    >
      <span class="metric-item__label">{{ item.label }}</span>
      <strong class="metric-item__value">{{ item.value }}</strong>
      <small v-if="item.hint" class="metric-item__hint">{{ item.hint }}</small>
    </component>
  </section>
</template>

<style scoped>
.metric-strip {
  display: grid;
  grid-template-columns: repeat(var(--metric-columns), minmax(0, 1fr));
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}
.metric-item {
  display: flex;
  min-width: 0;
  min-height: 96px;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  padding: 20px 24px 20px 0;
  background: transparent;
  border: 0;
  border-left: 1px solid var(--color-border);
  border-radius: 0;
  color: inherit;
  text-align: left;
}
.metric-item:first-child { padding-left: 0; border-left: 0; }
.metric-item:nth-child(n + 2) { padding-left: 24px; }
button.metric-item { cursor: pointer; }
button.metric-item:hover { background: var(--color-surface); }
.metric-item__label { color: var(--color-text-tertiary); font-size: 13px; }
.metric-item__value { color: var(--color-text); font-size: 28px; font-weight: 600; line-height: 1.2; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.metric-item__hint { color: var(--color-text-quaternary); font-size: 12px; }
.metric-strip[data-compact='true'] .metric-item { min-height: 84px; padding: 16px 16px 16px 0; }
.metric-strip[data-compact='true'] .metric-item:nth-child(n + 2) { padding-left: 16px; }
.metric-strip[data-compact='true'] .metric-item:nth-child(odd) { padding-left: 0; border-left: 0; }
.metric-strip[data-compact='true'] .metric-item:nth-child(n + 3) { border-top: 1px solid var(--color-border); }
.metric-strip[data-compact='true'] .metric-item__value { font-size: 24px; }
</style>
