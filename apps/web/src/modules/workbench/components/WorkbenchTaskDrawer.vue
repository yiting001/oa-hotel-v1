<script setup lang="ts">
import UiDataList, { type DataColumn } from '../../../ui/UiDataList.vue';
import { Printer, Share, View } from '@element-plus/icons-vue';
import type { DocumentAttachmentItem, WorkbenchItem, WorkflowOverview } from '@oa/contracts';
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
import {
  fieldLabels,
  formatFieldValue,
  hiddenDetailFields,
  hiddenItemFields,
} from '../../../shared/field';
import { formatDateTime } from '../../../shared/format';
import { useWorkflowStore } from '../../../shared/workflow';
import { useSessionStore } from '../../../shared/session';
import AttachmentUploadField from '../../../shared/components/AttachmentUploadField.vue';
import FoodPurchaseItemsEditor from '../../food-purchase/components/FoodPurchaseItemsEditor.vue';
import type { FoodPurchaseItem } from '../../food-purchase/food-purchase.types';
import PurchaseApprovalEditor from '../../purchase/components/PurchaseApprovalEditor.vue';
import type { PurchaseItem } from '../../purchase/purchase.types';
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
/** 人工选择下一步：行政审批人勾选的后续审核方。 */
const selectedChoices = ref<string[]>([]);
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
const itemColumns = computed<DataColumn[]>(() =>
  itemKeys.value.map((key) => ({ key, label: fieldLabels[key] ?? key, minWidth: 120 })),
);

const itemKeys = computed(() =>
  [...new Set(items.value.flatMap((item) => Object.keys(item)))].filter(
    (key) => !hiddenItemFields.has(key),
  ),
);
/** 食材采购：当前审批领导可直接删减、修改明细。 */
const canModerateFood = computed(
  () => props.task?.documentType === 'FOOD_PURCHASE' && data.value?.canModerate === true,
);
const foodItems = computed<FoodPurchaseItem[]>(() =>
  Array.isArray(data.value?.items) ? (data.value.items as FoodPurchaseItem[]) : [],
);
/** 采购审批：当前采购经办可补充单价和附件。 */
const canModeratePurchase = computed(
  () => props.task?.documentType === 'PURCHASE_APPROVAL' && data.value?.canModerate === true,
);
const purchaseItems = computed<PurchaseItem[]>(() =>
  Array.isArray(data.value?.items) ? (data.value.items as PurchaseItem[]) : [],
);
const choiceHint = computed(() =>
  props.task?.documentType === 'CONTRACT_REQUEST'
    ? '勾选下一步审核的部门（可多选），该部门审核完成后自动送主管领导审批。'
    : '可先指派外部律师或兄弟部门先行审核，审核完成后回到本人继续办理。',
);
/** 请示的办公室节点必须勾选部门，否则“同意”按钮不可用。 */
const choiceRequired = computed(
  () => props.task?.documentType === 'CONTRACT_REQUEST' && isChoiceTask.value,
);
const attachments = computed<DocumentAttachmentItem[]>(() =>
  Array.isArray(data.value?.attachments)
    ? (data.value.attachments as DocumentAttachmentItem[]).filter((item) =>
        typeof item === 'string' ? item.length > 0 : Boolean(item && item.fileName),
      )
    : [],
);
const currentStep = computed(() => {
  const value = overview.value;
  if (!value) return 0;
  return value.document.status === 'APPROVED'
    ? value.definition.steps.length
    : (value.document.currentStep ?? 0);
});
const currentChoiceOptions = computed(() => overview.value?.currentTask?.choiceOptions ?? []);
const isChoiceTask = computed(
  () => overview.value?.currentTask?.nodeKind === 'CHOICE' && currentChoiceOptions.value.length > 0,
);
const pendingBranches = computed(() =>
  (overview.value?.pendingBranches ?? []).filter((branch) => branch.status === 'PENDING'),
);
const settledBranches = computed(() =>
  (overview.value?.pendingBranches ?? []).filter((branch) => branch.status === 'COMPLETED'),
);

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
    selectedChoices.value = [];
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

/** 审批领导保存明细调整后刷新单据数据与审批概览。 */
function reloadDocument(): void {
  if (props.task) void load(props.task, ++loadSequence);
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

/** A4 打印页包含完整审批意见，可直接作为“审批结果”打印或导出 PDF。 */
function printApprovalResult(): void {
  if (!props.task) return;
  const url = router.resolve(
    `/documents/${props.task.documentType}/${props.task.documentId}/print`,
  ).href;
  window.open(url, '_blank', 'noopener');
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
    const choices = action.value === 'approve' ? [...selectedChoices.value] : [];
    await workflow.completeTask(
      props.task.taskId,
      action.value,
      comment.value.trim(),
      commandRequestId.value,
      choices,
    );
    ElMessage.success(
      action.value === 'return'
        ? '单据已退回上一步'
        : choices.length > 0
          ? '已指派后续审核'
          : '审批已提交',
    );
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
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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
          <el-button :icon="Printer" link @click="printApprovalResult">打印审批结果</el-button>
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
        <FoodPurchaseItemsEditor
          v-if="canModerateFood && items.length"
          class="workbench-task-detail__items"
          :document-id="task.documentId"
          :items="foodItems"
          @saved="reloadDocument"
        />
        <UiDataList
          v-if="items.length && !canModerateFood && !canModeratePurchase"
          class="workbench-task-detail__items"
          :columns="itemColumns"
          empty-text="暂无明细"
          :rows="items"
        >
          <template
            v-for="key in itemKeys"
            :key="key"
            #[`cell-${key}`]="{ row }"
          >{{ formatFieldValue(key, (row as Record<string, unknown>)[key]) }}</template>
        </UiDataList>
      </section>
      <section v-if="canModeratePurchase && items.length">
        <h3>补充单价与附件</h3>
        <PurchaseApprovalEditor
          :document-id="task.documentId"
          :items="purchaseItems"
          :attachments="attachments"
          @saved="reloadDocument"
        />
      </section>
      <section v-if="!canModeratePurchase">
        <h3>附件材料（{{ attachments.length }}）</h3>
        <AttachmentUploadField v-if="attachments.length" :model-value="attachments" readonly />
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
      <section v-if="isChoiceTask || pendingBranches.length > 0">
        <h3>下一步审核方</h3>
        <p class="workbench-task-detail__version">{{ choiceHint }}</p>
        <el-checkbox-group v-if="isChoiceTask" v-model="selectedChoices" class="workbench-task-detail__choices">
          <el-checkbox v-for="option in currentChoiceOptions" :key="option.id" :value="option.id">
            {{ option.name }}
          </el-checkbox>
        </el-checkbox-group>
        <div v-if="pendingBranches.length" class="workbench-task-detail__branches">
          <span v-for="branch in pendingBranches" :key="branch.taskId">
            <el-tag effect="plain" type="warning" size="small">办理中</el-tag>{{ branch.label }}
          </span>
        </div>
        <div v-if="settledBranches.length" class="workbench-task-detail__branches">
          <span v-for="branch in settledBranches" :key="branch.taskId">
            <el-tag effect="plain" type="success" size="small">已办</el-tag>
            {{ branch.label }}<template v-if="branch.completedByName"> · {{ branch.completedByName }}</template>
          </span>
        </div>
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
        ><el-button
          :disabled="choiceRequired && selectedChoices.length === 0"
          type="primary"
          @click="requestAction('approve')"
        >
          {{ selectedChoices.length > 0 ? '指派并继续' : '同意' }}
        </el-button>
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

<style scoped>
.workbench-task-detail { min-width: 0; }
.workbench-task-detail > header {
  display: flex;
  min-width: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--color-border);
}
.workbench-task-detail > header > div:first-child { min-width: 0; flex: 1 1 auto; }
.workbench-task-detail > header span { color: var(--color-text-tertiary); font-size: 12px; }
.workbench-task-detail h2 { margin: 4px 0 0; font-size: 20px; font-weight: 600; overflow-wrap: anywhere; }
.workbench-task-detail__header-actions { display: flex; flex: 0 0 auto; align-items: center; gap: 8px; }
.workbench-task-detail section { margin-top: 24px; }
.workbench-task-detail h3 { margin: 0 0 12px; font-size: 16px; font-weight: 600; }
.workbench-task-detail__version { margin: 0 0 16px; color: var(--color-text-tertiary); font-size: 12px; }
.workbench-task-detail__items { margin-top: 12px; }
.workbench-task-detail :deep(.el-timeline-item__content) { display: grid; gap: 2px; }
.workbench-task-detail :deep(.el-timeline-item__content p) { margin: 6px 0 0; color: var(--color-text-secondary); }
.workbench-task-detail :deep(.el-timeline-item__content span) { color: var(--color-text-tertiary); font-size: 12px; }
.workbench-task-detail__actions { display: flex; align-items: center; gap: 8px; }
.workbench-task-detail__actions .el-button { flex: 1; }
.workbench-task-detail__choices { display: grid; gap: 8px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.workbench-task-detail__choices :deep(.el-checkbox) { margin-right: 0; min-height: var(--control-h-sm); }
.workbench-task-detail__branches { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 10px; }
.workbench-task-detail__branches span { display: inline-flex; align-items: center; gap: 6px; color: var(--color-text-secondary); font-size: 13px; }
html[data-layout='compact'] .workbench-task-detail__choices { grid-template-columns: minmax(0, 1fr); }
html[data-layout='compact'] .workbench-task-detail > header { flex-direction: column; gap: 12px; }
html[data-layout='compact'] .workbench-task-detail__header-actions { width: 100%; flex-wrap: wrap; }
</style>
