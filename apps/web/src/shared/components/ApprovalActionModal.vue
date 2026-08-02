<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = defineProps<{
  open: boolean;
  action: 'approve' | 'return';
  documentTitle: string;
  submitting?: boolean;
}>();

const emit = defineEmits<{
  'update:open': [value: boolean];
  submit: [comment: string];
}>();

const comment = ref('');
const title = computed(() => (props.action === 'approve' ? '确认同意' : '确认退回'));
const okText = computed(() => (props.action === 'approve' ? '同意并流转' : '退回发起人'));

watch(
  () => props.open,
  (open) => {
    if (open) {
      comment.value = '';
    }
  },
);

function submit(): void {
  const normalized = comment.value.trim();
  if (!normalized) {
    return;
  }
  emit('submit', normalized);
}
</script>

<template>
  <a-modal
    :cancel-button-props="{ disabled: submitting }"
    :confirm-loading="submitting"
    :ok-button-props="{ disabled: !comment.trim() }"
    :ok-text="okText"
    :open="open"
    :title="title"
    @cancel="emit('update:open', false)"
    @ok="submit"
  >
    <a-alert
      :message="
        action === 'approve'
          ? `同意后，${documentTitle}将流转到下一审批节点。`
          : `退回后，${documentTitle}将由发起人修改并重新提交。`
      "
      :type="action === 'approve' ? 'info' : 'warning'"
      show-icon
    />
    <a-form-item label="审批意见" required style="margin-top: 16px">
      <a-textarea
        v-model:value="comment"
        :maxlength="1000"
        :rows="4"
        placeholder="请输入明确的审批意见"
        show-count
      />
    </a-form-item>
  </a-modal>
</template>
