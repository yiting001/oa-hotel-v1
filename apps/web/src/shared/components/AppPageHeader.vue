<script setup lang="ts">
import { computed } from 'vue';
import { useLayoutMode } from '../../ui/useLayoutMode';

const props = defineProps<{
  title: string;
  description?: string;
  eyebrow?: string;
}>();
const { isCompact } = useLayoutMode();
const showEyebrow = computed(() => Boolean(props.eyebrow));
</script>

<template>
  <header class="page-header" :data-compact="isCompact">
    <div class="page-header__copy">
      <span v-if="showEyebrow" class="page-header__eyebrow">{{ eyebrow }}</span>
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
      <div v-if="$slots.meta" class="page-header__meta"><slot name="meta" /></div>
    </div>
    <div v-if="$slots.actions" class="page-header__actions"><slot name="actions" /></div>
  </header>
</template>

<style scoped>
.page-header {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--color-border);
}
.page-header__copy { min-width: 0; flex: 1 1 320px; }
.page-header__eyebrow { display: block; margin-bottom: 8px; color: var(--color-text-tertiary); font-size: 12px; font-weight: 600; }
.page-header h1 { margin: 0; font-size: 32px; font-weight: 600; line-height: 1.25; overflow-wrap: anywhere; }
.page-header p { margin: 8px 0 0; max-width: 76ch; color: var(--color-text-tertiary); font-size: 14px; line-height: 1.6; }
.page-header__meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-top: 12px; color: var(--color-text-tertiary); font-size: 13px; }
.page-header__actions { display: flex; flex: 0 0 auto; flex-wrap: wrap; align-items: center; gap: 8px; padding-top: 4px; }
.page-header[data-compact='true'] { flex-direction: column; align-items: stretch; gap: 16px; padding-bottom: 16px; }
/* 紧凑模式改为纵向后，320px 的 flex-basis 会撑出大片空白 */
.page-header[data-compact='true'] .page-header__copy { flex: 0 0 auto; }
.page-header[data-compact='true'] h1 { font-size: 24px; }
.page-header[data-compact='true'] .page-header__actions { padding-top: 0; }
.page-header[data-compact='true'] .page-header__actions :deep(.el-button) { min-height: 40px; }
</style>
