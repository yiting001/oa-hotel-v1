<script setup lang="ts">
import { Paperclip } from '@element-plus/icons-vue';
import AttachmentField from '../../shared/components/AttachmentField.vue';

defineProps<{ modelValue: string[]; editable: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>();
</script>

<template>
  <AttachmentField
    v-if="editable"
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
  />
  <p v-else-if="modelValue.length === 0" class="seal-attachments__empty ui-text-muted">无附件</p>
  <ul v-else class="seal-attachments" aria-label="附件文件名清单">
    <li v-for="(name, index) in modelValue" :key="`${index}-${name}`">
      <el-icon aria-hidden="true"><Paperclip /></el-icon>
      <span>{{ name }}</span>
    </li>
  </ul>
</template>

<style scoped>
.seal-attachments { display: grid; gap: 0; margin: 0; padding: 0; list-style: none; }
.seal-attachments li { display: flex; align-items: center; gap: 8px; min-width: 0; min-height: 36px; padding: 4px 2px; border-bottom: 1px solid var(--color-border); }
.seal-attachments li > span { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.seal-attachments .el-icon { color: var(--color-text-tertiary); }
.seal-attachments__empty { margin: 0; font-size: 13px; }
</style>
