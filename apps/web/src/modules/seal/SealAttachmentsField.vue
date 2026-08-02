<script setup lang="ts">
import { FileOutlined } from '@ant-design/icons-vue';
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
  <a-empty v-else-if="modelValue.length === 0" description="无附件" />
  <a-list v-else :data-source="modelValue" size="small">
    <template #renderItem="{ item }">
      <a-list-item><FileOutlined /> {{ item }}</a-list-item>
    </template>
  </a-list>
</template>
