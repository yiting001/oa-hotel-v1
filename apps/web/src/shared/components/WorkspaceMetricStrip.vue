<script setup lang="ts">
defineProps<{
  label: string;
  items: ReadonlyArray<{ key: string; label: string; value: number | string }>;
}>();
</script>

<template>
  <section :aria-label="label" class="workspace-metric-strip" data-testid="workspace-metric-strip">
    <div v-for="item in items" :key="item.key" data-testid="workspace-metric-item">
      <span>{{ item.label }}</span>
      <strong>{{ item.value }}</strong>
    </div>
  </section>
</template>

<style scoped>
.workspace-metric-strip {
  display: grid;
  min-height: 82px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin: 8px 0 20px;
  background: var(--color-surface);
  border-block: 1px solid var(--color-border);
}

.workspace-metric-strip > div {
  display: grid;
  min-width: 0;
  align-content: center;
  gap: 4px;
  padding: 14px 20px;
}

.workspace-metric-strip > div + div {
  border-left: 1px solid var(--color-border);
}

.workspace-metric-strip span {
  color: var(--color-text-secondary);
  font-size: 13px;
  overflow-wrap: anywhere;
}

.workspace-metric-strip strong {
  color: var(--color-text);
  font-size: 24px;
  line-height: 1.2;
}

@media (max-width: 767px) {
  .workspace-metric-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-bottom: 16px;
  }

  .workspace-metric-strip > div {
    min-height: 78px;
    padding: 12px 18px;
  }

  .workspace-metric-strip > div:nth-child(3) {
    border-left: 0;
  }

  .workspace-metric-strip > div:nth-child(n + 3) {
    border-top: 1px solid var(--color-border);
  }
}
</style>
