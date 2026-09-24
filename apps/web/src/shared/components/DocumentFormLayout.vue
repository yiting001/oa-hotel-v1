<script setup lang="ts">
import { computed } from 'vue';
import { useLayoutMode } from '../../ui/useLayoutMode';
import AppPageHeader from './AppPageHeader.vue';
import StatusTag from './StatusTag.vue';

const props = defineProps<{
  title: string;
  eyebrow?: string;
  description?: string;
  documentNumber?: string | null;
  status?: string | null;
  revision?: number | null;
  loading?: boolean;
}>();
const { isCompact } = useLayoutMode();
const hasMeta = computed(
  () => Boolean(props.documentNumber) || Boolean(props.status) || props.revision != null,
);
</script>

<template>
  <div class="document-page ui-page">
    <AppPageHeader :description="description" :eyebrow="eyebrow" :title="title">
      <template v-if="hasMeta || $slots.meta" #meta>
        <span v-if="documentNumber" class="document-page__number">{{ documentNumber }}</span>
        <StatusTag v-if="status" :status="status" />
        <span v-if="revision != null">修订 {{ revision }}</span>
        <slot name="meta" />
      </template>
      <template v-if="$slots.headerActions" #actions><slot name="headerActions" /></template>
    </AppPageHeader>

    <div v-loading="loading" class="document-page__content" :aria-busy="loading">
      <div class="document-page__layout" :data-compact="isCompact" :data-has-aside="Boolean($slots.aside)">
        <main class="document-page__main"><slot /></main>
        <aside v-if="$slots.aside" class="document-page__aside"><slot name="aside" /></aside>
      </div>
      <footer v-if="$slots.actions" class="document-page__actions"><slot name="actions" /></footer>
    </div>
  </div>
</template>

<style scoped>
.document-page__number { font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.document-page__layout { display: grid; grid-template-columns: minmax(0, 1fr); align-items: start; gap: 32px; }
.document-page__layout[data-has-aside='true'] { grid-template-columns: minmax(0, 1fr) minmax(260px, 320px); }
.document-page__main { min-width: 0; padding-bottom: 72px; }
.document-page__aside {
  min-width: 0;
  position: sticky;
  top: calc(var(--shell-header-height) + 24px);
  max-height: calc(100vh - var(--shell-header-height) - 48px);
  padding-left: 24px;
  overflow-y: auto;
  border-left: 1px solid var(--color-border);
}
.document-page__actions {
  position: sticky;
  z-index: 5;
  bottom: 0;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
  padding: 16px 0;
  background: var(--color-canvas);
  border-top: 1px solid var(--color-border);
}
.document-page__layout[data-compact='true'][data-has-aside='true'] { grid-template-columns: minmax(0, 1fr); gap: 24px; }
.document-page__layout[data-compact='true'] .document-page__aside { position: static; max-height: none; padding: 24px 0 0; border-top: 1px solid var(--color-border); border-left: 0; }
.document-page__layout[data-compact='true'] .document-page__main { padding-bottom: 24px; }
.document-page__actions :deep(.el-button) { flex: 1 1 auto; }
</style>
