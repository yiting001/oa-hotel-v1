<script setup lang="ts">
import {
  ArrowLeftOutlined,
  CheckOutlined,
  ExportOutlined,
  SaveOutlined,
} from '@ant-design/icons-vue';
import type { WorkflowOverview } from '@oa/contracts';
import { message } from 'ant-design-vue';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import AttachmentField from '../../../shared/components/AttachmentField.vue';
import DocumentFormLayout from '../../../shared/components/DocumentFormLayout.vue';
import FormSection from '../../../shared/components/FormSection.vue';
import WorkflowSidebar from '../../../shared/components/WorkflowSidebar.vue';
import { useDirectoryStore } from '../../../shared/directory';
import { todayIso } from '../../../shared/format';
import { useSessionStore } from '../../../shared/session';
import { useWorkflowStore } from '../../../shared/workflow';
import {
  createRequisitionLine,
  hydrateRequisitionLines,
  toRequisitionPayload,
  validateRequisition,
} from '../domain/supply-form';
import { supplyRouteNames } from '../route-names';
import { supplyApi } from '../supply-api';
import type { FieldErrors, MaterialItem, RequisitionEnvelope, RequisitionLineForm } from '../types';
import RequisitionItemsEditor from './RequisitionItemsEditor.vue';

const props = defineProps<{ documentId?: string }>();

const router = useRouter();
const session = useSessionStore();
const directory = useDirectoryStore();
const workflow = useWorkflowStore();

const currentId = ref<string | null>(props.documentId ?? null);
const response = ref<RequisitionEnvelope | null>(null);
const overview = ref<WorkflowOverview | null>(null);
const materials = ref<MaterialItem[]>([]);
const loading = ref(false);
const saving = ref(false);
const submitting = ref(false);
const pageError = ref('');
const errors = ref<FieldErrors>({});
const form = reactive<{
  applicationDate: string;
  contactUserId: string;
  items: RequisitionLineForm[];
  attachments: string[];
}>({
  applicationDate: todayIso(),
  contactUserId: '',
  items: [createRequisitionLine()],
  attachments: [],
});

const status = computed(() => overview.value?.document.status ?? response.value?.document.status);
const revision = computed(
  () => overview.value?.document.revision ?? response.value?.document.revision,
);
const editable = computed(
  () => !currentId.value || status.value === 'DRAFT' || status.value === 'RETURNED',
);
const hasIssuePermission = computed(() => session.can('SUPPLY_ISSUE'));
const canIssue = computed(
  () =>
    Boolean(currentId.value) &&
    status.value === 'APPROVED' &&
    response.value?.data.issueStatus === 'NOT_ISSUED' &&
    hasIssuePermission.value,
);
const applicantName = computed(() => {
  const applicantId = response.value?.data.applicantId;
  return (
    directory.users.find((user) => user.id === applicantId)?.displayName ??
    session.user?.displayName ??
    '-'
  );
});
const departmentName = computed(() => {
  const departmentId = response.value?.data.departmentId;
  return (
    directory.departments.find((department) => department.id === departmentId)?.name ??
    session.user?.departmentName ??
    '-'
  );
});
const issueStatusLabel = computed(() => {
  const labels: Record<string, string> = {
    NOT_ISSUED: '待发放',
    PARTIALLY_ISSUED: '部分发放（已锁单）',
    ISSUED: '已发放',
  };
  const value = response.value?.data.issueStatus;
  return value ? (labels[value] ?? value) : '尚未生成';
});

onMounted(() => {
  void initialize();
});

async function initialize(): Promise<void> {
  loading.value = true;
  pageError.value = '';
  try {
    await Promise.all([session.ensureSession(), directory.load()]);
    form.contactUserId ||= session.user?.id ?? '';
    if (!currentId.value) {
      materials.value = await supplyApi.listItems();
      return;
    }
    const [inventory, requisition, documentOverview] = await Promise.all([
      supplyApi.listItems(),
      supplyApi.getRequisition(currentId.value),
      workflow.loadOverview(currentId.value),
    ]);
    materials.value = inventory;
    response.value = requisition;
    overview.value = documentOverview;
    form.applicationDate = requisition.data.applicationDate;
    form.contactUserId = requisition.data.contactUserId;
    form.items = hydrateRequisitionLines(requisition.data);
    form.attachments = [...requisition.data.attachments];
  } catch (error) {
    pageError.value = errorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function saveDraft(): Promise<void> {
  await persist(false);
}

async function submitDocument(): Promise<void> {
  await persist(true);
}

async function persist(submitAfterSave: boolean): Promise<void> {
  const validation = validateRequisition(form.applicationDate, form.contactUserId, form.items);
  errors.value = validation;
  pageError.value = '';
  if (Object.keys(validation).length > 0) {
    pageError.value = '表单存在未完成或不符合规则的字段，请检查红色提示。';
    return;
  }

  const wasNew = currentId.value === null;
  const state = submitAfterSave ? submitting : saving;
  state.value = true;
  try {
    const saved = await supplyApi.saveRequisition(
      currentId.value,
      toRequisitionPayload(form.applicationDate, form.contactUserId, form.items, form.attachments),
    );
    currentId.value = saved.data.id;
    response.value = saved;
    if (submitAfterSave) {
      await supplyApi.submit(saved.data.id);
    }
    overview.value = await workflow.loadOverview(saved.data.id);
    await workflow.refresh();
    message.success(submitAfterSave ? '领用单已提交审批' : '领用草稿已保存');
    if (wasNew) {
      await router.replace({
        name: supplyRouteNames.requisitionEdit,
        params: { id: saved.data.id },
      });
    }
  } catch (error) {
    pageError.value = errorMessage(error);
  } finally {
    state.value = false;
  }
}

function openIssue(): void {
  if (!currentId.value) {
    return;
  }
  void router.push({ name: supplyRouteNames.requisitionIssue, params: { id: currentId.value } });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '操作失败，请稍后重试';
}
</script>

<template>
  <DocumentFormLayout
    class="supply-document"
    description="库存项目自动带出基础信息，审批通过后由仓库管理员另行登记实发。"
    :document-number="response?.data.number"
    :loading="loading"
    :revision="revision"
    :status="status"
    title="物品领用申请单"
  >
    <template #headerActions>
      <a-space wrap>
        <a-button @click="router.push({ name: supplyRouteNames.overview })">
          <template #icon><ArrowLeftOutlined /></template>
          返回台账
        </a-button>
        <a-button v-if="canIssue" type="primary" @click="openIssue">
          <template #icon><ExportOutlined /></template>
          登记实发
        </a-button>
      </a-space>
    </template>

    <a-alert v-if="pageError" class="page-alert" :message="pageError" show-icon type="error" />
    <a-alert
      v-if="currentId && !editable"
      class="page-alert"
      message="单据已进入审批或归档状态，申请内容仅可查看；审批通过不代表库存已出库。"
      show-icon
      type="info"
    />

    <FormSection title="申请信息" description="单号由系统生成，申请人和部门来自登录会话。">
      <div class="header-field-grid">
        <a-form-item label="申请人">
          <a-input :value="applicantName" disabled />
        </a-form-item>
        <a-form-item label="部门">
          <a-input :value="departmentName" disabled />
        </a-form-item>
        <a-form-item
          label="填写日期"
          required
          :help="errors.applicationDate"
          :validate-status="errors.applicationDate ? 'error' : undefined"
        >
          <a-input
            :disabled="!editable"
            :value="form.applicationDate"
            type="date"
            @update:value="(value: string) => (form.applicationDate = value)"
          />
        </a-form-item>
        <a-form-item
          label="联系人"
          required
          :help="errors.contactUserId"
          :validate-status="errors.contactUserId ? 'error' : undefined"
        >
          <a-select
            :disabled="!editable"
            :loading="directory.loading"
            :value="form.contactUserId || undefined"
            option-filter-prop="label"
            placeholder="选择联系人"
            show-search
            @update:value="(value: string) => (form.contactUserId = value)"
          >
            <a-select-option
              v-for="user in directory.users"
              :key="user.id"
              :label="`${user.displayName} ${user.departmentName}`"
              :value="user.id"
            >
              {{ user.displayName }} · {{ user.departmentName }}
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="发放状态">
          <a-input :value="issueStatusLabel" disabled />
        </a-form-item>
      </div>
    </FormSection>

    <FormSection
      title="领用明细"
      description="物资编号、品名、规格和单位来自库存目录，不能由申请人手工修改。"
    >
      <RequisitionItemsEditor
        v-model="form.items"
        :disabled="!editable"
        :errors="errors"
        :materials="materials"
      />
    </FormSection>

    <FormSection
      title="相关附件"
      description="当前接口保存附件名称；文件持久化、下载鉴权和病毒扫描仍需后端附件服务支持。"
    >
      <AttachmentField v-if="editable" v-model="form.attachments" />
      <a-empty v-else-if="form.attachments.length === 0" description="无附件" />
      <a-space v-else wrap>
        <a-tag v-for="attachment in form.attachments" :key="attachment">
          {{ attachment }}
        </a-tag>
      </a-space>
    </FormSection>

    <template #aside>
      <WorkflowSidebar :loading="loading" :overview="overview" />
    </template>

    <template #actions>
      <a-space wrap>
        <a-button @click="router.push({ name: supplyRouteNames.overview })">取消</a-button>
        <a-button :disabled="!editable" :loading="saving" @click="saveDraft">
          <template #icon><SaveOutlined /></template>
          保存草稿
        </a-button>
        <a-popconfirm
          description="提交后将进入审批流程，审批中不能修改。"
          ok-text="确认提交"
          title="提交物品领用申请单？"
          @confirm="submitDocument"
        >
          <a-button :disabled="!editable" :loading="submitting" type="primary">
            <template #icon><CheckOutlined /></template>
            提交审批
          </a-button>
        </a-popconfirm>
      </a-space>
    </template>
  </DocumentFormLayout>
</template>

<style scoped>
.page-alert {
  margin-bottom: 16px;
}

.header-field-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.supply-document :deep(.form-section) {
  background: #fff;
  border-bottom: 1px solid #e5e9f0;
  padding: 22px 0;
}

.supply-document :deep(.form-section:first-child) {
  padding-top: 0;
}

@media (max-width: 767px) {
  .header-field-grid {
    grid-template-columns: 1fr;
  }
}
</style>
