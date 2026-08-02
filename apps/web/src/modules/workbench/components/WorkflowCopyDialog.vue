<script setup lang="ts">
import type { DirectoryUser } from '@oa/contracts';
import { ElMessage } from 'element-plus';
import { ref, watch } from 'vue';
import { copyWorkflowDocument, loadWorkflowCopyRecipients } from '../api/workbench-api';

const props = defineProps<{ open: boolean; documentId: string }>();
const emit = defineEmits<{ 'update:open': [value: boolean]; copied: [] }>();
const recipientIds = ref<string[]>([]);
const recipients = ref<DirectoryUser[]>([]);
const loading = ref(false);
const submitting = ref(false);
let loadSequence = 0;

watch(
  () => [props.open, props.documentId] as const,
  ([open]) => {
    const sequence = ++loadSequence;
    recipientIds.value = [];
    recipients.value = [];
    if (open) void loadRecipients(sequence);
  },
);

async function loadRecipients(sequence: number): Promise<void> {
  loading.value = true;
  try {
    const result = await loadWorkflowCopyRecipients(props.documentId);
    if (sequence === loadSequence && props.open) recipients.value = result;
  } catch (error) {
    if (sequence === loadSequence && props.open) {
      ElMessage.error(error instanceof Error ? error.message : '可抄送人员加载失败');
    }
  } finally {
    if (sequence === loadSequence) loading.value = false;
  }
}

async function submit(): Promise<void> {
  if (recipientIds.value.length === 0) return;
  submitting.value = true;
  try {
    const result = await copyWorkflowDocument(props.documentId, recipientIds.value);
    ElMessage.success(`已抄送给 ${result.deliveries.length} 人`);
    emit('update:open', false);
    emit('copied');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '抄送失败');
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <el-dialog
    :model-value="open"
    title="抄送单据"
    width="min(520px, 92vw)"
    @update:model-value="emit('update:open', $event)"
  >
    <el-select
      v-model="recipientIds"
      aria-label="选择抄送接收人"
      data-testid="workflow-copy-recipients"
      filterable
      :loading="loading"
      multiple
      :placeholder="loading ? '正在加载可抄送人员' : '选择接收人'"
      style="width: 100%"
    >
      <el-option
        v-for="user in recipients"
        :key="user.id"
        :label="`${user.displayName} · ${user.departmentName}`"
        :value="user.id"
      />
      <template #empty>
        <el-empty description="暂无可抄送人员" :image-size="56" />
      </template>
    </el-select>
    <template #footer>
      <el-button @click="emit('update:open', false)">取消</el-button>
      <el-button
        aria-label="确认抄送"
        data-testid="workflow-copy-confirm"
        :disabled="recipientIds.length === 0"
        :loading="submitting"
        type="primary"
        @click="submit"
        >确认抄送</el-button
      >
    </template>
  </el-dialog>
</template>
