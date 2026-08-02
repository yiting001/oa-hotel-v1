<script setup lang="ts">
defineProps<{
  label: string;
  resultLabel?: string;
}>();
</script>

<template>
  <section :aria-label="label" class="workspace-filter-bar" data-testid="workspace-filter-bar">
    <div class="workspace-filter-bar__search"><slot name="search" /></div>
    <div v-if="$slots.filters" class="workspace-filter-bar__filters">
      <slot name="filters" />
    </div>
    <div v-if="$slots.actions" class="workspace-filter-bar__actions">
      <slot name="actions" />
    </div>
    <span v-if="resultLabel" class="workspace-filter-bar__result">{{ resultLabel }}</span>
  </section>
</template>

<style scoped>
.workspace-filter-bar {
  display: grid;
  min-width: 0;
  grid-template-columns: minmax(240px, 1fr) auto auto auto;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.workspace-filter-bar__search {
  min-width: 0;
}

.workspace-filter-bar__filters,
.workspace-filter-bar__actions {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.workspace-filter-bar__filters :deep(.ant-select),
.workspace-filter-bar__filters :deep(.el-select) {
  width: 160px;
}

.workspace-filter-bar__search :deep(.ant-input-affix-wrapper),
.workspace-filter-bar__search :deep(.ant-input-search),
.workspace-filter-bar__search :deep(.el-input) {
  width: 100%;
}

.workspace-filter-bar__result {
  color: var(--color-text-secondary);
  font-size: 13px;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .workspace-filter-bar {
    grid-template-columns: minmax(0, 1fr) auto auto;
  }

  .workspace-filter-bar__search {
    grid-column: 1 / -1;
  }
}

@media (max-width: 767px) {
  .workspace-filter-bar {
    grid-template-columns: minmax(0, 1fr);
  }

  .workspace-filter-bar__search,
  .workspace-filter-bar__filters,
  .workspace-filter-bar__actions,
  .workspace-filter-bar__result {
    grid-column: 1;
  }

  .workspace-filter-bar__filters {
    align-items: stretch;
    flex-direction: column;
  }

  .workspace-filter-bar__filters :deep(.ant-select),
  .workspace-filter-bar__filters :deep(.el-select),
  .workspace-filter-bar__actions :deep(.ant-btn),
  .workspace-filter-bar__actions :deep(.el-button) {
    width: 100%;
  }

  .workspace-filter-bar__result {
    justify-self: end;
  }
}
</style>
