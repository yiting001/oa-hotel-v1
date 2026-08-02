<script setup lang="ts">
import { ArrowLeftOutlined, CheckOutlined } from '@ant-design/icons-vue';
import type { WorkflowOverview } from '@oa/contracts';
import type { FormInstance } from 'ant-design-vue';
import type { Rule } from 'ant-design-vue/es/form';
import { message } from 'ant-design-vue';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DocumentFormLayout from '../../shared/components/DocumentFormLayout.vue';
import FormSection from '../../shared/components/FormSection.vue';
import WorkflowSidebar from '../../shared/components/WorkflowSidebar.vue';
import { formatDate, formatDateTime } from '../../shared/format';
import { useSessionStore } from '../../shared/session';
import { useWorkflowStore } from '../../shared/workflow';
import SealApplicantSection from './SealApplicantSection.vue';
import SealAttachmentsField from './SealAttachmentsField.vue';
import {
  checkoutSealBorrow,
  executeSealUse,
  getSealBorrow,
  getSealUse,
  returnSealBorrow,
} from './seal.api';
import { getExecutionStatusMeta, sealAssetTypeLabels } from './seal.constants';
import type { SealBorrowRecord, SealUseRecord } from './seal.types';
import { useSealResources } from './useSealResources';

type SealDocumentType = 'SEAL_BORROW' | 'SEAL_USE';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const workflow = useWorkflowStore();
const resources = useSealResources();
const checkoutFormRef = ref<FormInstance>();
const returnFormRef = ref<FormInstance>();
const useFormRef = ref<FormInstance>();
const borrowRecord = ref<SealBorrowRecord | null>(null);
const useRecord = ref<SealUseRecord | null>(null);
const overview = ref<WorkflowOverview | null>(null);
const loading = ref(false);
const submitting = ref(false);
const errorMessage = ref('');

const checkoutForm = reactive({ actualRecipient: '', checkedOutAt: '' });
const returnForm = reactive({
  returnedAt: '',
  returnCondition: '',
  hasException: false,
  exceptionNote: '',
});
const useForm = reactive({
  stampedCopies: null as number | null,
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
const selectedAssets = computed(() =>
  (record.value?.sealAssetIds ?? []).map((id) =>
    resources.assets.value.find((asset) => asset.id === id),
  ),
);

const checkoutRules: Record<string, Rule[]> = {
  actualRecipient: [
    { required: true, whitespace: true, message: '请输入实际领用人' },
    { max: 200, message: '实际领用人不能超过 200 个字符' },
  ],
  checkedOutAt: [{ required: true, message: '请选择实际领用时间' }],
};
const returnRules: Record<string, Rule[]> = {
  returnedAt: [{ required: true, message: '请选择实际归还时间' }],
  returnCondition: [
    { required: true, whitespace: true, message: '请输入实际归还状态' },
    { max: 500, message: '实际归还状态不能超过 500 个字符' },
  ],
  exceptionNote: [
    {
      validator: async () => {
        if (returnForm.hasException && !returnForm.exceptionNote.trim()) {
          throw new Error('存在异常时必须填写异常说明');
        }
      },
    },
  ],
};
const useRules: Record<string, Rule[]> = {
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
    message.success('领用登记已完成');
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
    message.success('归还登记已完成');
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
    message.success('用印执行登记已完成');
  } catch (error) {
    setError(error);
  } finally {
    submitting.value = false;
  }
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
      <a-button @click="router.push('/seal')">
        <template #icon><ArrowLeftOutlined /></template>
        返回台账
      </a-button>
    </template>

    <a-alert
      v-if="errorMessage"
      :message="errorMessage"
      closable
      show-icon
      type="error"
      @close="errorMessage = ''"
    />

    <template v-if="record && overview">
      <SealApplicantSection
        :applicant-name="applicantName"
        :application-date="record.applicationDate"
        :department-name="departmentName"
      />

      <FormSection title="申请事项">
        <a-descriptions :column="{ xs: 1, sm: 2 }" bordered size="small">
          <template v-if="borrowRecord">
            <a-descriptions-item label="使用日期">{{
              formatDate(borrowRecord.useDate)
            }}</a-descriptions-item>
            <a-descriptions-item label="计划归还">{{
              formatDate(borrowRecord.plannedReturnDate)
            }}</a-descriptions-item>
            <a-descriptions-item label="前往地点" :span="2">{{
              borrowRecord.destination
            }}</a-descriptions-item>
            <a-descriptions-item label="陪同人" :span="2">
              {{ borrowRecord.companionIds.map(resources.userName).join('、') || '-' }}
            </a-descriptions-item>
          </template>
          <template v-else-if="useRecord">
            <a-descriptions-item label="使用日期">{{
              formatDate(useRecord.useDate)
            }}</a-descriptions-item>
            <a-descriptions-item label="用途">{{ useRecord.purpose }}</a-descriptions-item>
          </template>
          <a-descriptions-item label="申请内容" :span="2">{{ record.content }}</a-descriptions-item>
        </a-descriptions>
      </FormSection>

      <FormSection title="印章证照">
        <div class="seal-execution-assets">
          <a-tag v-for="(asset, index) in selectedAssets" :key="asset?.id ?? index">
            {{ asset?.name ?? record.sealAssetIds[index] }}
            <template v-if="asset"> · {{ sealAssetTypeLabels[asset.type] ?? asset.type }}</template>
          </a-tag>
        </div>
      </FormSection>

      <FormSection title="相关附件">
        <SealAttachmentsField :editable="false" :model-value="record.attachments" />
      </FormSection>

      <FormSection title="执行状态">
        <a-descriptions :column="{ xs: 1, sm: 2 }" bordered size="small">
          <a-descriptions-item label="当前状态" :span="2">
            <a-tag :color="executionMeta.color">{{ executionMeta.label }}</a-tag>
          </a-descriptions-item>
          <template v-if="borrowRecord">
            <a-descriptions-item v-if="borrowRecord.actualRecipient" label="实际领用人">
              {{ borrowRecord.actualRecipient }}
            </a-descriptions-item>
            <a-descriptions-item v-if="borrowRecord.checkedOutAt" label="实际领用时间">
              {{ formatDateTime(borrowRecord.checkedOutAt) }}
            </a-descriptions-item>
            <a-descriptions-item v-if="borrowRecord.returnedAt" label="实际归还时间">
              {{ formatDateTime(borrowRecord.returnedAt) }}
            </a-descriptions-item>
            <a-descriptions-item v-if="borrowRecord.returnCondition" label="归还状态">
              {{ borrowRecord.returnCondition }}
            </a-descriptions-item>
            <a-descriptions-item v-if="borrowRecord.exceptionNote" label="异常说明" :span="2">
              {{ borrowRecord.exceptionNote }}
            </a-descriptions-item>
          </template>
          <template v-else-if="useRecord && useRecord.executionStatus === 'EXECUTED'">
            <a-descriptions-item label="盖章份数">{{
              useRecord.stampedCopies
            }}</a-descriptions-item>
            <a-descriptions-item label="实际用印时间">{{
              formatDateTime(useRecord.executedAt)
            }}</a-descriptions-item>
            <a-descriptions-item label="文件归档号">{{
              useRecord.archiveNumber
            }}</a-descriptions-item>
            <a-descriptions-item label="执行备注">{{
              useRecord.executionNote || '-'
            }}</a-descriptions-item>
          </template>
        </a-descriptions>
      </FormSection>

      <a-alert
        v-if="!hasExecutePermission"
        message="当前账号无执行登记权限"
        show-icon
        type="info"
      />
      <a-alert
        v-else-if="!approved"
        message="单据审批通过后方可执行登记"
        show-icon
        type="warning"
      />

      <FormSection
        v-if="showActionForm && borrowRecord?.executionStatus === 'NOT_CHECKED_OUT'"
        title="领用登记"
      >
        <a-form
          ref="checkoutFormRef"
          :model="checkoutForm"
          :rules="checkoutRules"
          layout="vertical"
        >
          <div class="seal-execution-grid">
            <a-form-item label="实际领用人" name="actualRecipient">
              <a-input v-model:value="checkoutForm.actualRecipient" :maxlength="200" />
            </a-form-item>
            <a-form-item label="实际领用时间" name="checkedOutAt">
              <a-input v-model:value="checkoutForm.checkedOutAt" type="datetime-local" />
            </a-form-item>
          </div>
        </a-form>
      </FormSection>

      <FormSection
        v-if="showActionForm && borrowRecord?.executionStatus === 'CHECKED_OUT'"
        title="归还登记"
      >
        <a-form ref="returnFormRef" :model="returnForm" :rules="returnRules" layout="vertical">
          <div class="seal-execution-grid">
            <a-form-item label="实际归还时间" name="returnedAt">
              <a-input v-model:value="returnForm.returnedAt" type="datetime-local" />
            </a-form-item>
            <a-form-item label="实际归还状态" name="returnCondition">
              <a-input v-model:value="returnForm.returnCondition" :maxlength="500" />
            </a-form-item>
            <a-form-item class="seal-execution-grid__full" name="hasException">
              <a-checkbox v-model:checked="returnForm.hasException">存在异常</a-checkbox>
            </a-form-item>
            <a-form-item
              v-if="returnForm.hasException"
              class="seal-execution-grid__full"
              label="异常说明"
              name="exceptionNote"
            >
              <a-textarea v-model:value="returnForm.exceptionNote" :rows="4" />
            </a-form-item>
          </div>
        </a-form>
      </FormSection>

      <FormSection
        v-if="showActionForm && useRecord?.executionStatus === 'NOT_EXECUTED'"
        title="用印登记"
      >
        <a-form ref="useFormRef" :model="useForm" :rules="useRules" layout="vertical">
          <div class="seal-execution-grid">
            <a-form-item label="盖章份数" name="stampedCopies">
              <a-input-number
                v-model:value="useForm.stampedCopies"
                :min="1"
                :precision="0"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item label="实际用印时间" name="executedAt">
              <a-input v-model:value="useForm.executedAt" type="datetime-local" />
            </a-form-item>
            <a-form-item label="文件归档号" name="archiveNumber">
              <a-input v-model:value="useForm.archiveNumber" :maxlength="200" />
            </a-form-item>
            <a-form-item label="执行备注" name="executionNote">
              <a-textarea v-model:value="useForm.executionNote" :rows="3" />
            </a-form-item>
          </div>
        </a-form>
      </FormSection>
    </template>

    <template #aside>
      <WorkflowSidebar :loading="loading" :overview="overview" />
    </template>

    <template #actions>
      <div class="seal-execution-actions">
        <a-button @click="router.push('/seal')">
          <template #icon><ArrowLeftOutlined /></template>
          返回
        </a-button>
        <a-button
          v-if="showActionForm"
          :loading="submitting"
          type="primary"
          @click="
            borrowRecord?.executionStatus === 'NOT_CHECKED_OUT'
              ? registerCheckout()
              : borrowRecord?.executionStatus === 'CHECKED_OUT'
                ? registerReturn()
                : registerUse()
          "
        >
          <template #icon><CheckOutlined /></template>
          确认登记
        </a-button>
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

.seal-execution-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 20px;
}

.seal-execution-grid__full {
  grid-column: 1 / -1;
}

.seal-execution-actions {
  display: flex;
  justify-content: space-between;
  width: 100%;
}

@media (max-width: 767px) {
  .seal-execution-grid {
    grid-template-columns: 1fr;
  }

  .seal-execution-grid__full {
    grid-column: auto;
  }

  .seal-execution-actions {
    gap: 8px;
  }

  .seal-execution-actions > :deep(.ant-btn) {
    flex: 1;
  }
}
</style>
