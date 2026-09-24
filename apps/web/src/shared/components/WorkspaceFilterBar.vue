<script setup lang="ts">
import { useLayoutMode } from '../../ui/useLayoutMode';

defineProps<{ label: string; resultLabel?: string }>();
const { isCompact } = useLayoutMode();
</script>

<template>
  <section
    :aria-label="label"
    class="workspace-filter-bar ui-toolbar"
    :data-compact="isCompact"
    data-testid="workspace-filter-bar"
  >
    <div v-if="$slots.search" class="workspace-filter-bar__search"><slot name="search" /></div>
    <div v-if="$slots.filters" class="workspace-filter-bar__filters"><slot name="filters" /></div>
    <div v-if="$slots.actions" class="workspace-filter-bar__actions"><slot name="actions" /></div>
    <span v-if="resultLabel" class="workspace-filter-bar__result ui-text-muted">{{ resultLabel }}</span>
  </section>
</template>

<style scoped>
.workspace-filter-bar { margin-bottom: 16px; }
.workspace-filter-bar__search {
  width: min(100%, var(--control-w-search));
  flex: 0 0 auto;
}
.workspace-filter-bar__search :deep(.el-input) { width: 100%; }
.workspace-filter-bar__filters,
.workspace-filter-bar__actions {
  display: flex;
  min-width: 0;
  align-items: center;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: var(--filter-gap);
}
.workspace-filter-bar__filters :deep(.el-select) { width: var(--control-w-select); }
/* 动作插槽在无内容时不占行（避免紧凑模式留下空档） */
.workspace-filter-bar__actions:empty { display: none; }
.workspace-filter-bar__result { margin-left: auto; flex: 0 0 auto; font-size: 13px; white-space: nowrap; }
.workspace-filter-bar[data-compact='true'] .workspace-filter-bar__search,
.workspace-filter-bar[data-compact='true'] .workspace-filter-bar__filters,
.workspace-filter-bar[data-compact='true'] .workspace-filter-bar__actions { width: 100%; }
.workspace-filter-bar[data-compact='true'] .workspace-filter-bar__search :deep(.el-select),
.workspace-filter-bar[data-compact='true'] .workspace-filter-bar__filters :deep(.el-select) { width: 100%; }
.workspace-filter-bar[data-compact='true'] .workspace-filter-bar__result { margin-left: 0; }
</style>
