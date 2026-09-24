<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import UiDialog from '../../ui/UiDialog.vue';

const props = defineProps<{ open: boolean; action: 'approve' | 'return'; documentTitle: string; submitting?: boolean }>();
const emit = defineEmits<{ 'update:open': [value: boolean]; submit: [comment: string] }>();
const comment = ref('');
const visible = computed({ get: () => props.open, set: (value: boolean) => emit('update:open', value) });
const title = computed(() => props.action === 'approve' ? '确认同意' : '确认退回');
const okText = computed(() => props.action === 'approve' ? '同意并流转' : '退回发起人');
watch(() => props.open, (open) => { if (open) comment.value = ''; });
function submit(): void { const normalized = comment.value.trim(); if (normalized && !props.submitting) emit('submit', normalized); }
</script>

<template>
  <UiDialog v-model="visible" :title="title" width="520px">
    <p class="approval-action-modal__context">{{ action === 'approve' ? '同意后将流转到下一审批节点' : '退回后将由发起人修改并重新提交' }}：{{ documentTitle }}</p>
    <label class="approval-action-modal__label" for="approval-comment">审批意见 <span aria-hidden="true">*</span></label>
    <el-input id="approval-comment" v-model="comment" type="textarea" :maxlength="1000" :rows="4" placeholder="请输入明确的审批意见" show-word-limit />
    <template #footer>
      <el-button :disabled="submitting" @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" :disabled="!comment.trim()" @click="submit">{{ okText }}</el-button>
    </template>
  </UiDialog>
</template>

<style scoped>
.approval-action-modal__context { margin: 0 0 18px; line-height: 1.6; overflow-wrap: anywhere; }
.approval-action-modal__label { display: block; margin-bottom: 8px; font-weight: 600; }
.approval-action-modal__label span { color: var(--color-error, #c04242); }
</style>
