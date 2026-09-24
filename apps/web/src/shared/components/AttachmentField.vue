<script setup lang="ts">
import { ref } from 'vue';
import { Close, Paperclip, Plus } from '@element-plus/icons-vue';

const props = withDefaults(defineProps<{ modelValue: string[]; readonly?: boolean }>(), { readonly: false });
const emit = defineEmits<{ 'update:modelValue': [value: string[]] }>();
const filename = ref('');

function add(): void {
  const name = filename.value.trim();
  if (!name || props.readonly || props.modelValue.includes(name)) return;
  emit('update:modelValue', [...props.modelValue, name]);
  filename.value = '';
}
function remove(index: number): void {
  if (props.readonly) return;
  emit('update:modelValue', props.modelValue.filter((_, itemIndex) => itemIndex !== index));
}
</script>

<template>
  <div class="attachment-field">
    <div v-if="!readonly" class="attachment-field__entry">
      <el-input v-model="filename" aria-label="附件文件名" placeholder="输入附件文件名" @keyup.enter="add" />
      <el-button :icon="Plus" :disabled="!filename.trim() || modelValue.includes(filename.trim())" @click="add">添加</el-button>
    </div>
    <ul v-if="modelValue.length" class="attachment-field__list" aria-label="附件文件名清单">
      <li v-for="(name, index) in modelValue" :key="`${index}-${name}`">
        <el-icon aria-hidden="true"><Paperclip /></el-icon>
        <span>{{ name }}</span>
        <el-button v-if="!readonly" :icon="Close" text circle :aria-label="`移除${name}`" @click="remove(index)" />
      </li>
    </ul>
    <p v-else class="attachment-field__empty ui-text-muted">暂无附件文件名</p>
    <small v-if="!readonly" class="attachment-field__note ui-text-muted">仅记录文件名，不上传文件。</small>
  </div>
</template>

<style scoped>
.attachment-field { min-width: 0; }
.attachment-field__entry { display: flex; gap: 8px; max-width: 540px; }
.attachment-field__entry :deep(.el-input) { min-width: 0; }
.attachment-field__list { display: grid; gap: 0; margin: 10px 0 0; padding: 0; list-style: none; }
.attachment-field__list li { display: flex; align-items: center; gap: 8px; min-width: 0; min-height: 36px; padding: 4px 2px; border-bottom: 1px solid var(--color-border); }
.attachment-field__list li > span { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.attachment-field__list .el-icon { color: var(--color-text-secondary); }
.attachment-field__empty, .attachment-field__note { margin: 8px 0 0; font-size: 12px; }
@media (max-width: 600px) { .attachment-field__entry { max-width: none; } }
</style>
