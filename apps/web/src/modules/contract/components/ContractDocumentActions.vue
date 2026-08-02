<script setup lang="ts">
import { ArrowLeftOutlined, SaveOutlined, SendOutlined } from '@ant-design/icons-vue';

withDefaults(
  defineProps<{
    editable: boolean;
    saving?: boolean;
    submitting?: boolean;
  }>(),
  { saving: false, submitting: false },
);

const emit = defineEmits<{
  back: [];
  save: [];
  submit: [];
}>();
</script>

<template>
  <a-button :disabled="saving || submitting" @click="emit('back')">
    <template #icon><ArrowLeftOutlined /></template>
    返回列表
  </a-button>
  <a-button :disabled="!editable || submitting" :loading="saving" @click="emit('save')">
    <template #icon><SaveOutlined /></template>
    保存草稿
  </a-button>
  <a-button
    :disabled="!editable || saving"
    :loading="submitting"
    type="primary"
    @click="emit('submit')"
  >
    <template #icon><SendOutlined /></template>
    保存并提交
  </a-button>
</template>
