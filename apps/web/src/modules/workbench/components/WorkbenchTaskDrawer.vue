<script setup lang="ts">
import { Paperclip, Share, View } from '@element-plus/icons-vue';
import type { WorkbenchItem, WorkflowOverview } from '@oa/contracts';
import { ElMessage } from 'element-plus';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { apiRequest, requestId, type ApiEnvelope } from '../../../shared/api';
import {
  approvalActionLabels,
  documentDetailPath,
  documentTypeMeta,
  workflowNodeLabel,
} from '../../../shared/document';
import { fieldLabels, formatFieldValue, hiddenDetailFields } from '../../../shared/field';
import { formatDateTime } from '../../../shared/format';
import { useWorkflowStore } from '../../../shared/workflow';
import { useSessionStore } from '../../../shared/session';
import DocumentFollowButton from './DocumentFollowButton.vue';
import WorkflowCopyDialog from './WorkflowCopyDialog.vue';

const props = defineProps<{ open: boolean; task: WorkbenchItem | null }>();
const emit = defineEmits<{
  'update:open': [value: boolean];
  completed: [];
  'collaboration-changed': [];
}>();
const router = useRouter();
const workflow = useWorkflowStore();
const session = useSessionStore();
const loading = ref(false);
const overview = ref<WorkflowOverview | null>(null);
const data = ref<Record<string, unknown> | null>(null);
const actionDialogOpen = ref(false);
const action = ref<'approve' | 'return'>('approve');
const comment = ref('');
const submitting = ref(false);
const loadedItemId = ref<string | null>(null);
const commandRequestId = ref<string | null>(null);
const mobile = ref(false);
const copyDialogOpen = ref(false);
let loadSequence = 0;
let mobileMedia: MediaQueryList | null = null;

const fields = computed(() =>
  Object.entries(data.value ?? {})
    .filter(([key, value]) => !hiddenDetailFields.has(key) && !isObjectValue(value))
    .map(([key, value]) => ({
      key,
      label: fieldLabels[key] ?? key,
      value: formatFieldValue(key, value),
    })),
);
const items = computed<Record<string, unknown>[]>(() =>
  Array.isArray(data.value?.items) ? (data.value.items as Record<string, unknown>[]) : [],
);
const itemKeys = computed(() =>
  [...new Set(items.value.flatMap((item) => Object.keys(item)))].filter(
    (key) => key !== 'materialItemId',
  ),
);
const attachments = computed(() =>
  Array.isArray(data.value?.attachments)
    ? data.value.attachments.filter((value): value is string => typeof value === 'string')
    : [],
);
const currentStep = computed(() => {
  const value = overview.value;
  if (!value) return 0;
  return value.document.status === 'APPROVED'
    ? value.definition.steps.length
    : (value.document.currentStep ?? 0);
});
const taskNodeLabel = computed(() => {
  const task = props.task;
  if (!task) return '审批节点';
  if (task.processNodeName) return task.processNodeName;
  if (task.assigneeRole) return workflowNodeLabel(task.assigneeRole);
  return task.currentStep === null ? '审批节点' : `第 ${task.currentStep + 1} 步`;
});

onMounted(() => {
  mobileMedia = window.matchMedia('(max-width: 767px)');
  syncMobileLayout(mobileMedia);
  mobileMedia.addEventListener('change', syncMobileLayout);
});
onBeforeUnmount(() => mobileMedia?.removeEventListener('change', syncMobileLayout));

watch(
  () => [props.open, props.task?.id] as const,
  ([open]) => {
    const sequence = ++loadSequence;
    overview.value = null;
    data.value = null;
    loadedItemId.value = null;
    actionDialogOpen.value = false;
    copyDialogOpen.value = false;
    comment.value = '';
    commandRequestId.value = null;
    if (open && props.task) {
      void load(props.task, sequence);
    } else {
      loading.value = false;
    }
  },
  { immediate: true },
);

async function load(task: WorkbenchItem, sequence: number): Promise<void> {
  loading.value = true;
  try {
    const meta = documentTypeMeta[task.documentType];
    const [nextOverview, envelope] = await Promise.all([
      workflow.loadOverview(task.documentId),
      apiRequest<ApiEnvelope<Record<string, unknown>>>(meta.apiPath(task.documentId)),
    ]);
    if (sequence !== loadSequence || !props.open || props.task?.id !== task.id) return;
    overview.value = nextOverview;
    data.value = envelope.data;
    loadedItemId.value = task.id;
  } catch (error) {
    if (sequence === loadSequence && props.open && props.task?.id === task.id) {
      ElMessage.error(error instanceof Error ? error.message : '单据详情加载失败');
    }
  } finally {
    if (sequence === loadSequence) loading.value = false;
  }
}

function requestAction(nextAction: 'approve' | 'return'): void {
  action.value = nextAction;
  comment.value = '';
  commandRequestId.value = requestId();
  actionDialogOpen.value = true;
}

function openFullDocument(): void {
  if (!props.task) return;
  emit('update:open', false);
  void router.push(documentDetailPath(props.task.documentType, props.task.documentId));
}

function syncMobileLayout(event: MediaQueryList | MediaQueryListEvent): void {
  mobile.value = event.matches;
}

async function submitAction(): Promise<void> {
  if (
    !props.task?.taskId ||
    !commandRequestId.value ||
    loadedItemId.value !== props.task.id ||
    !comment.value.trim()
  )
    return;
  submitting.value = true;
  try {
    await workflow.completeTask(
      props.task.taskId,
      action.value,
      comment.value.trim(),
      commandRequestId.value,
    );
    ElMessage.success(action.value === 'approve' ? '审批已提交' : '单据已退回发起人');
    actionDialogOpen.value = false;
    commandRequestId.value = null;
    emit('update:open', false);
    emit('completed');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '审批处理失败');
  } finally {
    submitting.value = false;
  }
}

function isObjectValue(value: unknown): boolean {
  return typeof value === 'object' && value !== null;
}

function clearCommandIntent(): void {
  if (!submitting.value) commandRequestId.value = null;
}
</script>

<template>
  <el-drawer
    :model-value="open"
    size="min(860px, 100%)"
    title="审批单据"
    @update:model-value="emit('update:open', $event)"
  >
    <el-skeleton v-if="loading" :rows="14" animated />
    <div v-else-if="task && overview" class="workbench-task-detail">
      <header>
        <div>
          <span>{{ documentTypeMeta[task.documentType].label }}</span>
          <h2>{{ task.documentTitle }}</h2>
        </div>
        <div class="workbench-task-detail__header-actions">
          <el-tag type="primary">{{ taskNodeLabel }}</el-tag>
          <DocumentFollowButton
            v-if="session.can('DOCUMENT_FOLLOW')"
            compact
            :document-id="task.documentId"
            @changed="emit('collaboration-changed')"
          />
          <el-button
            v-if="session.can('WORKFLOW_COPY')"
            :icon="Share"
            link
            @click="copyDialogOpen = true"
            >抄送</el-button
          >
          <el-button :icon="View" link type="primary" @click="openFullDocument"
            >查看完整单据</el-button
          >
        </div>
      </header>
      <section>
        <h3>关键业务信息</h3>
        <el-descriptions :column="mobile ? 1 : 2" border>
          <el-descriptions-item v-for="field in fields" :key="field.key" :label="field.label">{{
            field.value
          }}</el-descriptions-item>
        </el-descriptions>
        <el-table v-if="items.length" :data="items" class="workbench-task-detail__items">
          <el-table-column
            v-for="key in itemKeys"
            :key="key"
            :label="fieldLabels[key] ?? key"
            min-width="120"
          >
            <template #default="{ row }">{{ formatFieldValue(key, row[key]) }}</template>
          </el-table-column>
        </el-table>
      </section>
      <section>
        <h3>附件材料（{{ attachments.length }}）</h3>
        <div v-if="attachments.length" class="workbench-task-detail__attachments">
          <span v-for="attachment in attachments" :key="attachment">
            <el-icon><Paperclip /></el-icon>{{ attachment }}
          </span>
        </div>
        <el-empty v-else description="无附件" :image-size="52" />
      </section>
      <section>
        <h3>审批路径</h3>
        <p class="workbench-task-detail__version">
          {{ overview.definition.name }} · V{{ overview.definition.version }}
        </p>
        <el-steps
          :active="currentStep"
          :direction="mobile ? 'vertical' : 'horizontal'"
          finish-status="success"
        >
          <el-step
            v-for="step in overview.definition.steps"
            :key="step"
            :title="workflowNodeLabel(step)"
          />
        </el-steps>
      </section>
      <section>
        <h3>审批记录</h3>
        <el-timeline>
          <el-timeline-item
            v-for="opinion in overview.opinions"
            :key="opinion.id"
            :timestamp="formatDateTime(opinion.createdAt)"
          >
            <strong>{{ approvalActionLabels[opinion.action] ?? opinion.action }}</strong>
            <span>{{ opinion.actorName }} · {{ opinion.actorDepartmentName || '-' }}</span>
            <p>{{ opinion.comment }}</p>
          </el-timeline-item>
        </el-timeline>
      </section>
    </div>
    <template
      v-if="
        task?.box === 'PENDING' && task.taskId && loadedItemId === task.id && !loading && overview
      "
      #footer
    >
      <div class="workbench-task-detail__actions">
        <el-button type="danger" plain @click="requestAction('return')">退回</el-button
        ><el-button type="primary" @click="requestAction('approve')">同意</el-button>
      </div>
    </template>
  </el-drawer>

  <el-dialog
    v-model="actionDialogOpen"
    :title="action === 'approve' ? '同意审批' : '退回单据'"
    width="min(480px, 92vw)"
    @closed="clearCommandIntent"
  >
    <el-input
      v-model="comment"
      :rows="5"
      maxlength="500"
      placeholder="请输入审批意见"
      show-word-limit
      type="textarea"
    />
    <template #footer
      ><el-button @click="actionDialogOpen = false">取消</el-button
      ><el-button
        :disabled="!comment.trim()"
        :loading="submitting"
        :type="action === 'approve' ? 'primary' : 'danger'"
        @click="submitAction"
        >确认</el-button
      ></template
    >
  </el-dialog>
  <WorkflowCopyDialog v-if="task" v-model:open="copyDialogOpen" :document-id="task.documentId" />
</template>
