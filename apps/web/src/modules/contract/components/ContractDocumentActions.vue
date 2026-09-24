<script setup lang="ts">
import { ArrowLeft, Check, Promotion } from '@element-plus/icons-vue';

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
  <div class="ui-actions">
    <el-button :disabled="saving || submitting" @click="emit('back')">
      <el-icon><ArrowLeft /></el-icon>返回列表
    </el-button>
    <el-button :disabled="!editable || submitting" :loading="saving" @click="emit('save')">
      <el-icon><Check /></el-icon>保存草稿
    </el-button>
    <el-button
      :disabled="!editable || saving"
      :loading="submitting"
      type="primary"
      @click="emit('submit')"
    >
      <el-icon><Promotion /></el-icon>保存并提交
    </el-button>
  </div>
</template>
