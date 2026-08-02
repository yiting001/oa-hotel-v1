<script setup lang="ts">
import type { DocumentStatus } from '@oa/contracts';
import { computed } from 'vue';
import { documentStatusMeta } from '../document';

const props = defineProps<{ status: string }>();

const meta = computed(() => {
  const known = documentStatusMeta[props.status as DocumentStatus];
  return known ?? { label: props.status, color: 'default' };
});
</script>

<template>
  <a-tag :color="meta.color">{{ meta.label }}</a-tag>
</template>
