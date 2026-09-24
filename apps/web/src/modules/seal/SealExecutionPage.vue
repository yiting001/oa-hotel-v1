<script setup lang="ts">
import type { WorkflowOverview } from '@oa/contracts';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DocumentFormLayout from '../../shared/components/DocumentFormLayout.vue';
import FormSection from '../../shared/components/FormSection.vue';
import KeyValueSummary from '../../shared/components/KeyValueSummary.vue';
import WorkflowSidebar from '../../shared/components/WorkflowSidebar.vue';
import { formatDate, formatDateTime } from '../../shared/format';
import { useSessionStore } from '../../shared/session';
import { useWorkflowStore } from '../../shared/workflow';
import { useLayoutMode } from '../../ui/useLayoutMode';
import SealApplicantSection from './SealApplicantSection.vue';
import SealAttachmentsField from './SealAttachmentsField.vue';
import {
  checkoutSealBorrow,
  executeSealUse,
  getSealBorrow,
  getSealUse,
  returnSealBorrow,
} from './seal.api';
import { getExecutionStatusMeta } from './seal.constants';
import type { SealBorrowRecord, SealUseRecord } from './seal.types';
import { useSealResources } from './useSealResources';

type SealDocumentType = 'SEAL_BORROW' | 'SEAL_USE';

interface SealSummaryRow {
  label: string;
  value: string | number | null | undefined;
  span?: number;
}

interface CheckoutForm {
  actualRecipient: string;
  checkedOutAt: string;
}

interface ReturnForm {
  returnedAt: string;
  returnCondition: string;
  hasException: boolean;
  exceptionNote: string;
}

interface UseForm {
  stampedCopies: number | null;
  executedAt: string;
  archiveNumber: string;
  executionNote: string;
}

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const workflow = useWorkflowStore();
const resources = useSealResources();
const { isCompact } = useLayoutMode();
const checkoutFormRef = ref<FormInstance>();
const returnFormRef = ref<FormInstance>();
const useFormRef = ref<FormInstance>();
const borrowRecord = ref<SealBorrowRecord | null>(null);
const useRecord = ref<SealUseRecord | null>(null);
const overview = ref<WorkflowOverview | null>(null);
const loading = ref(false);
const submitting = ref(false);
const errorMessage = ref('');

const checkoutForm = reactive<CheckoutForm>({ actualRecipient: '', checkedOutAt: '' });
const returnForm = reactive<ReturnForm>({
  returnedAt: '',
  returnCondition: '',
  hasException: false,
  exceptionNote: '',
});
const useForm = reactive<UseForm>({
  stampedCopies: null,
  executedAt: '',
  archiveNumber: '',
  executionNote: '',
});

const documentType = computed(() => String(route.params.documentType) as SealDocumentType);
const documentId = computed(() => String(route.params.id));
const supportedType = computed(() => ['SEAL_BORROW', 'SEAL_USE'].includes(documentType.value));
const record = computed(() => borrowRecord.value ?? useRecord.value);
const isBorrow = computed(() => documentType.value === 'SEAL_BORROW');
const hasExecutePermission = computed(() => session.can('SEAL_EXECUTE'));
const approved = computed(() => overview.value?.document.status === 'APPROVED');
const executionStatus = computed(() => record.value?.executionStatus ?? '');
const executionMeta = computed(() => getExecutionStatusMeta(executionStatus.value));
const pendingExecution = computed(() =>
  isBorrow.value
    ? ['NOT_CHECKED_OUT', 'CHECKED_OUT'].includes(executionStatus.value)
    : executionStatus.value === 'NOT_EXECUTED',
);
const showActionForm = computed(
  () => hasExecutePermission.value && approved.value && pendingExecution.value,
);
const applicantName = computed(() => resources.userName(record.value?.applicantId));
const departmentName = computed(() => resources.departmentName(record.value?.departmentId));

const applicationItems = computed<SealSummaryRow[]>(() => {
  if (borrowRecord.value) {
    return [
      { label: '使用日期', value: formatDate(borrowRecord.value.useDate) },
      { label: '计划归还', value: formatDate(borrowRecord.value.plannedReturnDate) },
      { label: '前往地点', value: borrowRecord.value.destination, span: 2 },
      {
        label: '陪同人',
        value: borrowRecord.value.companionIds.map(resources.userName).join('、') || '-',
        span: 2,
      },
      { label: '申请内容', value: record.value?.content, span: 2 },
    ];
  }
  if (useRecord.value) {
    return [
      { label: '使用日期', value: formatDate(useRecord.value.useDate) },
      { label: '用途', value: useRecord.value.purpose },
      { label: '申请内容', value: record.value?.content, span: 2 },
    ];
  }
  return [];
});

const executionItems = computed<SealSummaryRow[]>(() => {
  const items: SealSummaryRow[] = [];
  if (borrowRecord.value) {
    const borrow = borrowRecord.value;
    if (borrow.actualRecipient) {
      items.push({ label: '实际领用人', value: borrow.actualRecipient });
    }
    if (borrow.checkedOutAt) {
      items.push({ label: '实际领用时间', value: formatDateTime(borrow.checkedOutAt) });
    }
    if (borrow.returnedAt) {
      items.push({ label: '实际归还时间', value: formatDateTime(borrow.returnedAt) });
    }
    if (borrow.returnCondition) {
      items.push({ label: '归还状态', value: borrow.returnCondition });
    }
    if (borrow.exceptionNote) {
      items.push({ label: '异常说明', value: borrow.exceptionNote, span: 2 });
    }
    return items;
  }
  if (useRecord.value && useRecord.value.executionStatus === 'EXECUTED') {
    const use = useRecord.value;
    items.push(
      { label: '盖章份数', value: use.stampedCopies },
      { label: '实际用印时间', value: formatDateTime(use.executedAt) },
      { label: '文件归档号', value: use.archiveNumber },
      { label: '执行备注', value: use.executionNote || '-' },
    );
  }
  return items;
});

const checkoutRules: FormRules<CheckoutForm> = {
  actualRecipient: [
    { required: true, whitespace: true, message: '请输入实际领用人' },
    { max: 200, message: '实际领用人不能超过 200 个字符' },
  ],
  checkedOutAt: [{ required: true, message: '请选择实际领用时间' }],
};
const returnRules: FormRules<ReturnForm> = {
  returnedAt: [{ required: true, message: '请选择实际归还时间' }],
  returnCondition: [
    { required: true, whitespace: true, message: '请输入实际归还状态' },
    { max: 500, message: '实际归还状态不能超过 500 个字符' },
  ],
  exceptionNote: [
    {
      validator: (_rule, _value, callback) => {
        if (returnForm.hasException && !returnForm.exceptionNote.trim()) {
          callback(new Error('存在异常时必须填写异常说明'));
          return;
        }
        callback();
      },
    },
  ],
};
const useRules: FormRules<UseForm> = {
  stampedCopies: [
    { required: true, type: 'number', message: '请输入盖章份数' },
    { type: 'number', min: 1, message: '盖章份数必须大于 0' },
  ],
  executedAt: [{ required: true, message: '请选择实际用印时间' }],
  archiveNumber: [
    { required: true, whitespace: true, message: '请输入文件归档号' },
    { max: 200, message: '文件归档号不能超过 200 个字符' },
  ],
};

function setError(error: unknown): void {
  errorMessage.value = error instanceof Error ? error.message : '请求失败，请稍后重试';
}

function toIso(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('日期时间格式无效');
  }
  return date.toISOString();
}

async function loadDocument(): Promise<void> {
  if (!supportedType.value) {
    throw new Error('不支持的印章业务单据类型');
  }
  const documentRequest = isBorrow.value
    ? getSealBorrow(documentId.value)
    : getSealUse(documentId.value);
  const [response, loadedOverview] = await Promise.all([
    documentRequest,
    workflow.loadOverview(documentId.value),
  ]);
  if (loadedOverview.document.documentType !== documentType.value) {
    throw new Error('路由单据类型与实际单据不一致');
  }
  if (isBorrow.value) {
    borrowRecord.value = response.data as SealBorrowRecord;
    useRecord.value = null;
  } else {
    useRecord.value = response.data as SealUseRecord;
    borrowRecord.value = null;
  }
  overview.value = loadedOverview;
}

async function registerCheckout(): Promise<void> {
  await checkoutFormRef.value?.validate();
  submitting.value = true;
  errorMessage.value = '';
  try {
    const response = await checkoutSealBorrow(documentId.value, {
      actualRecipient: checkoutForm.actualRecipient.trim(),
      checkedOutAt: toIso(checkoutForm.checkedOutAt),
    });
    borrowRecord.value = response.data;
    await resources.load();
    ElMessage.success('领用登记已完成');
  } catch (error) {
    setError(error);
  } finally {
    submitting.value = false;
  }
}

async function registerReturn(): Promise<void> {
  await returnFormRef.value?.validate();
  submitting.value = true;
  errorMessage.value = '';
  try {
    const response = await returnSealBorrow(documentId.value, {
      returnedAt: toIso(returnForm.returnedAt),
      returnCondition: returnForm.returnCondition.trim(),
      exceptionNote: returnForm.hasException ? returnForm.exceptionNote.trim() : null,
    });
    borrowRecord.value = response.data;
    await resources.load();
    ElMessage.success('归还登记已完成');
  } catch (error) {
    setError(error);
  } finally {
    submitting.value = false;
  }
}

async function registerUse(): Promise<void> {
  await useFormRef.value?.validate();
  if (useForm.stampedCopies === null) return;
  submitting.value = true;
  errorMessage.value = '';
  try {
    const response = await executeSealUse(documentId.value, {
      stampedCopies: useForm.stampedCopies,
      executedAt: toIso(useForm.executedAt),
      archiveNumber: useForm.archiveNumber.trim(),
      executionNote: useForm.executionNote.trim() || null,
    });
    useRecord.value = response.data;
    ElMessage.success('用印执行登记已完成');
  } catch (error) {
    setError(error);
  } finally {
    submitting.value = false;
  }
}

function confirmRegistration(): void {
  if (borrowRecord.value?.executionStatus === 'NOT_CHECKED_OUT') {
    void registerCheckout();
    return;
  }
  if (borrowRecord.value?.executionStatus === 'CHECKED_OUT') {
    void registerReturn();
    return;
  }
  void registerUse();
}

onMounted(async () => {
  loading.value = true;
  errorMessage.value = '';
  try {
    await resources.load();
    await loadDocument();
  } catch (error) {
    setError(error);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <DocumentFormLayout
    :document-number="record?.number"
    :loading="loading"
    :revision="overview?.document.revision"
    :status="overview?.document.status"
    title="印章执行登记"
  >
    <template #headerActions>
      <el-button @click="router.push('/seal')">返回台账</el-button>
    </template>

    <el-alert v-if="errorMessage" :closable="false" :title="errorMessage" show-icon type="error" />

    <template v-if="record && overview">
      <SealApplicantSection
        :applicant-name="applicantName"
        :application-date="record.applicationDate"
        :department-name="departmentName"
      />

      <FormSection title="申请事项">
        <KeyValueSummary :items="applicationItems" />
      </FormSection>

      <FormSection title="印章证照">
        <div class="seal-execution-assets">
          <el-tag
            v-for="(name, index) in record.sealAssetNames"
            :key="`${name}-${index}`"
            effect="light"
            type="info"
          >
            {{ name }}
          </el-tag>
        </div>
      </FormSection>

      <FormSection title="相关附件">
        <SealAttachmentsField :editable="false" :model-value="record.attachments" />
      </FormSection>

      <FormSection title="执行状态">
        <div class="seal-execution-status">
          <span class="seal-execution-status__label">当前状态</span>
          <el-tag :type="executionMeta.color" effect="light">{{ executionMeta.label }}</el-tag>
        </div>
        <KeyValueSummary v-if="executionItems.length > 0" :items="executionItems" />
      </FormSection>

      <el-alert
        v-if="!hasExecutePermission"
        :closable="false"
        show-icon
        title="当前账号无执行登记权限"
        type="info"
      />
      <el-alert
        v-else-if="!approved"
        :closable="false"
        show-icon
        title="单据审批通过后方可执行登记"
        type="warning"
      />

      <FormSection
        v-if="showActionForm && borrowRecord?.executionStatus === 'NOT_CHECKED_OUT'"
        title="领用登记"
      >
        <el-form
          ref="checkoutFormRef"
          :model="checkoutForm"
          :rules="checkoutRules"
          label-position="top"
          @submit.prevent
        >
          <div class="ui-fields">
            <el-form-item label="实际领用人" prop="actualRecipient">
              <el-input
                v-model="checkoutForm.actualRecipient"
                :maxlength="200"
                placeholder="请输入实际领用人"
              />
            </el-form-item>
            <el-form-item label="实际领用时间" prop="checkedOutAt">
              <el-date-picker
                v-model="checkoutForm.checkedOutAt"
                format="YYYY-MM-DD HH:mm"
                placeholder="请选择实际领用时间"
                type="datetime"
                value-format="YYYY-MM-DDTHH:mm"
              />
            </el-form-item>
          </div>
        </el-form>
      </FormSection>

      <FormSection
        v-if="showActionForm && borrowRecord?.executionStatus === 'CHECKED_OUT'"
        title="归还登记"
      >
        <el-form
          ref="returnFormRef"
          :model="returnForm"
          :rules="returnRules"
          label-position="top"
          @submit.prevent
        >
          <div class="ui-fields">
            <el-form-item label="实际归还时间" prop="returnedAt">
              <el-date-picker
                v-model="returnForm.returnedAt"
                format="YYYY-MM-DD HH:mm"
                placeholder="请选择实际归还时间"
                type="datetime"
                value-format="YYYY-MM-DDTHH:mm"
              />
            </el-form-item>
            <el-form-item label="实际归还状态" prop="returnCondition">
              <el-input
                v-model="returnForm.returnCondition"
                :maxlength="500"
                placeholder="请输入实际归还状态"
              />
            </el-form-item>
            <el-form-item class="ui-field-full" prop="hasException">
              <el-checkbox v-model="returnForm.hasException">存在异常</el-checkbox>
            </el-form-item>
            <el-form-item
              v-if="returnForm.hasException"
              class="ui-field-full"
              label="异常说明"
              prop="exceptionNote"
            >
              <el-input
                v-model="returnForm.exceptionNote"
                placeholder="请输入异常说明"
                :rows="4"
                type="textarea"
              />
            </el-form-item>
          </div>
        </el-form>
      </FormSection>

      <FormSection
        v-if="showActionForm && useRecord?.executionStatus === 'NOT_EXECUTED'"
        title="用印登记"
      >
        <el-form
          ref="useFormRef"
          :model="useForm"
          :rules="useRules"
          label-position="top"
          @submit.prevent
        >
          <div class="ui-fields">
            <el-form-item label="盖章份数" prop="stampedCopies">
              <el-input-number
                v-model="useForm.stampedCopies"
                :min="1"
                :precision="0"
                controls-position="right"
              />
            </el-form-item>
            <el-form-item label="实际用印时间" prop="executedAt">
              <el-date-picker
                v-model="useForm.executedAt"
                format="YYYY-MM-DD HH:mm"
                placeholder="请选择实际用印时间"
                type="datetime"
                value-format="YYYY-MM-DDTHH:mm"
              />
            </el-form-item>
            <el-form-item label="文件归档号" prop="archiveNumber">
              <el-input
                v-model="useForm.archiveNumber"
                :maxlength="200"
                placeholder="请输入文件归档号"
              />
            </el-form-item>
            <el-form-item label="执行备注" prop="executionNote">
              <el-input
                v-model="useForm.executionNote"
                placeholder="请输入执行备注"
                :rows="3"
                type="textarea"
              />
            </el-form-item>
          </div>
        </el-form>
      </FormSection>
    </template>

    <template #aside>
      <WorkflowSidebar :loading="loading" :overview="overview" />
    </template>

    <template #actions>
      <div class="seal-execution-actions" :data-compact="isCompact">
        <el-button @click="router.push('/seal')">返回</el-button>
        <el-button
          v-if="showActionForm"
          :loading="submitting"
          type="primary"
          @click="confirmRegistration"
        >
          确认登记
        </el-button>
      </div>
    </template>
  </DocumentFormLayout>
</template>

<style scoped>
.seal-execution-assets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.seal-execution-status {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 0 12px;
  border-bottom: 1px solid var(--color-border);
}

.seal-execution-status__label {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.seal-execution-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}

.seal-execution-actions[data-compact='true'] :deep(.el-button) {
  flex: 1 1 auto;
}
</style>
