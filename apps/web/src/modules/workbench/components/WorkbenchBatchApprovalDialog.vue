<script setup lang="ts">
import type { BatchApprovalResult, WorkbenchItem } from '@oa/contracts';
import { ElMessage } from 'element-plus';
import { ref, watch } from 'vue';
import { requestId } from '../../../shared/api';
import { useWorkflowStore } from '../../../shared/workflow';

const props = defineProps<{ open: boolean; tasks: WorkbenchItem[] }>();
const emit = defineEmits<{
  'update:open': [value: boolean];
  completed: [result: BatchApprovalResult];
}>();
const workflow = useWorkflowStore();
const comment = ref('');
const commandRequestId = ref<string | null>(null);
const submitting = ref(false);
const result = ref<BatchApprovalResult | null>(null);
const resultOpen = ref(false);
const titleByTaskId = ref(new Map<string, string>());

watch(
  () => props.open,
  (open) => {
    if (!open || commandRequestId.value) return;
    comment.value = '';
    commandRequestId.value = requestId();
    titleByTaskId.value = new Map(
      props.tasks.map((task) => [task.taskId ?? task.id, task.documentTitle]),
    );
  },
);

async function submit(): Promise<void> {
  if (!commandRequestId.value || !comment.value.trim() || props.tasks.length === 0) return;
  submitting.value = true;
  try {
    result.value = await workflow.batchApprove(
      props.tasks.flatMap((task) => (task.taskId ? [task.taskId] : [])),
      comment.value.trim(),
      commandRequestId.value,
    );
    emit('update:open', false);
    resultOpen.value = true;
    emit('completed', result.value);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '批量审批失败');
  } finally {
    submitting.value = false;
  }
}

function cancel(): void {
  emit('update:open', false);
  commandRequestId.value = null;
  comment.value = '';
}

function closeResult(): void {
  resultOpen.value = false;
  result.value = null;
  titleByTaskId.value = new Map();
  commandRequestId.value = null;
  comment.value = '';
}
</script>

<template>
  <el-dialog
    :model-value="open"
    title="批量同意"
    width="min(540px, 94vw)"
    :close-on-click-modal="false"
    @close="cancel"
  >
    <el-alert :closable="false" type="warning">
      将逐项处理 {{ tasks.length }} 条待办，失败项不会影响其他任务。
    </el-alert>
    <el-input
      v-model="comment"
      aria-label="批量审批意见"
      data-testid="batch-approval-comment"
      :rows="5"
      maxlength="1000"
      placeholder="请输入统一审批意见"
      show-word-limit
      type="textarea"
    />
    <template #footer>
      <el-button @click="cancel">取消</el-button>
      <el-button
        aria-label="确认批量同意"
        data-testid="batch-approval-confirm"
        :disabled="!comment.trim()"
        :loading="submitting"
        type="primary"
        @click="submit"
        >确认同意</el-button
      >
    </template>
  </el-dialog>

  <el-dialog
    :model-value="resultOpen"
    data-testid="batch-approval-result"
    title="批量审批结果"
    width="min(720px, 96vw)"
    @close="closeResult"
  >
    <el-result
      v-if="result"
      :sub-title="`成功 ${result.succeeded} 项，失败 ${result.failed} 项`"
      :title="result.failed ? '部分任务未完成' : '全部审批完成'"
      :icon="result.failed ? 'warning' : 'success'"
    />
    <el-table v-if="result" :data="result.results" max-height="360">
      <el-table-column label="单据" min-width="220">
        <template #default="{ row }">{{ titleByTaskId.get(row.taskId) ?? row.taskId }}</template>
      </el-table-column>
      <el-table-column label="结果" width="100">
        <template #default="{ row }">
          <el-tag :type="row.status === 'SUCCEEDED' ? 'success' : 'danger'">
            {{ row.status === 'SUCCEEDED' ? '成功' : '失败' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="说明" min-width="180" prop="message" />
    </el-table>
    <template #footer><el-button type="primary" @click="closeResult">完成</el-button></template>
  </el-dialog>
</template>

<style scoped>
.el-alert + .el-textarea {
  margin-top: 16px;
}
</style>
