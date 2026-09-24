<script setup lang="ts">
import { computed } from 'vue';
import type { DocumentStatus } from '@oa/contracts';
import { documentStatusMeta } from '../document';

const props = defineProps<{ status: string }>();
const meta = computed(() => documentStatusMeta[props.status as DocumentStatus]);
const tone = computed(
  () =>
    ({
      DRAFT: 'neutral',
      IN_REVIEW: 'info',
      RETURNED: 'warning',
      APPROVED: 'success',
      CANCELLED: 'muted',
    })[props.status] ?? 'neutral',
);
</script>

<template>
  <span class="status-badge" :data-tone="tone">{{ meta?.label ?? status }}</span>
</template>

<style scoped>
.status-badge {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  padding: 3px 10px;
  border-radius: 9999px;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
  white-space: nowrap;
}
.status-badge[data-tone='neutral'] { color: #45515e; background: var(--color-surface-3); }
.status-badge[data-tone='muted'] { color: var(--color-text-tertiary); background: var(--color-surface-3); }
.status-badge[data-tone='info'] { color: #17437d; background: #dbeafe; }
.status-badge[data-tone='warning'] { color: var(--color-warning-text); background: var(--color-warning-bg); }
.status-badge[data-tone='success'] { color: var(--color-success-text); background: var(--color-success-bg); }
.status-badge[data-tone='danger'] { color: var(--color-error-text); background: var(--color-error-bg); }
</style>
