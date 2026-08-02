<script setup lang="ts">
import AppPageHeader from './AppPageHeader.vue';
import StatusTag from './StatusTag.vue';

defineProps<{
  title: string;
  description?: string;
  documentNumber?: string | null;
  status?: string | null;
  revision?: number | null;
  loading?: boolean;
}>();
</script>

<template>
  <div class="document-form-page">
    <AppPageHeader :description="description" :title="title">
      <template #meta>
        <a-space wrap>
          <span v-if="documentNumber" class="document-number">{{ documentNumber }}</span>
          <StatusTag v-if="status" :status="status" />
          <span v-if="revision">修订 {{ revision }}</span>
          <slot name="meta" />
        </a-space>
      </template>
      <template v-if="$slots.headerActions" #actions>
        <slot name="headerActions" />
      </template>
    </AppPageHeader>

    <a-spin :spinning="loading">
      <div class="document-form-layout">
        <main class="document-form-layout__main">
          <slot />
        </main>
        <aside class="document-form-layout__aside">
          <slot name="aside" />
        </aside>
      </div>
      <footer class="document-action-bar">
        <slot name="actions" />
      </footer>
    </a-spin>
  </div>
</template>
