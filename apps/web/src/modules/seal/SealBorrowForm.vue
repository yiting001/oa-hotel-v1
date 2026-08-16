<script setup lang="ts">
import {
  ArrowLeftOutlined,
  CheckOutlined,
  SaveOutlined,
  SendOutlined,
} from '@ant-design/icons-vue';
import type { WorkflowOverview } from '@oa/contracts';
import type { FormInstance } from 'ant-design-vue';
import type { Rule } from 'ant-design-vue/es/form';
import { message } from 'ant-design-vue';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import DocumentFormLayout from '../../shared/components/DocumentFormLayout.vue';
import FormSection from '../../shared/components/FormSection.vue';
import WorkflowSidebar from '../../shared/components/WorkflowSidebar.vue';
import { todayIso } from '../../shared/format';
import { useSessionStore } from '../../shared/session';
import { useWorkflowStore } from '../../shared/workflow';
import SealApplicantSection from './SealApplicantSection.vue';
import SealAttachmentsField from './SealAttachmentsField.vue';
import { getSealBorrow, saveSealBorrow, submitSealDocument } from './seal.api';
import type { SealBorrowInput, SealBorrowRecord } from './seal.types';
import { useSealResources } from './useSealResources';

const props = defineProps<{ documentId?: string }>();
const router = useRouter();
const session = useSessionStore();
const workflow = useWorkflowStore();
const resources = useSealResources();
const formRef = ref<FormInstance>();
const currentId = ref(props.documentId ?? '');
const record = ref<SealBorrowRecord | null>(null);
const overview = ref<WorkflowOverview | null>(null);
const responseDocument = ref<{
  status: string;
  revision: number;
} | null>(null);
const loading = ref(false);
const saving = ref(false);
const submitting = ref(false);
const errorMessage = ref('');

const form = reactive<SealBorrowInput>({
  useDate: '',
  plannedReturnDate: '',
  companionIds: [],
  destination: '',
  sealAssetNames: [],
  content: '',
  attachments: [],
});

const documentStatus = computed(
  () => overview.value?.document.status ?? responseDocument.value?.status ?? null,
);
const revision = computed(
  () => overview.value?.document.revision ?? responseDocument.value?.revision ?? null,
);
const canEdit = computed(
  () =>
    !loading.value &&
    (!currentId.value || ['DRAFT', 'RETURNED'].includes(documentStatus.value ?? '')),
);
const canExecute = computed(
  () => documentStatus.value === 'APPROVED' && session.can('SEAL_EXECUTE'),
);
const busy = computed(() => saving.value || submitting.value);
const applicantName = computed(
  () =>
    (record.value ? resources.userName(record.value.applicantId) : session.user?.displayName) ??
    '-',
);
const departmentName = computed(
  () =>
    (record.value
      ? resources.departmentName(record.value.departmentId)
      : session.user?.departmentName) ?? '-',
);
const applicationDate = computed(() => record.value?.applicationDate ?? todayIso());
const companionOptions = computed(() =>
  resources.directory.users.map((user) => ({
    value: user.id,
    label: `${user.displayName} · ${user.departmentName}`,
  })),
);

const rules: Record<keyof SealBorrowInput, Rule[]> = {
  useDate: [{ required: true, message: '请选择使用日期' }],
  plannedReturnDate: [
    { required: true, message: '请选择计划归还日期' },
    {
      validator: async () => {
        if (form.useDate && form.plannedReturnDate < form.useDate) {
          throw new Error('计划归还日期不能早于使用日期');
        }
      },
    },
  ],
  destination: [
    { required: true, whitespace: true, message: '请输入前往地点' },
    { max: 300, message: '前往地点不能超过 300 个字符' },
  ],
  sealAssetNames: [
    { required: true, type: 'array', min: 1, message: '请至少填写一项印章或证照名称' },
    {
      validator: async () => {
        if (form.sealAssetNames.some((name) => name.trim().length > 200)) {
          throw new Error('单项名称不能超过 200 个字符');
        }
      },
    },
  ],
  content: [
    { required: true, whitespace: true, message: '请输入申请内容' },
    { max: 5000, message: '申请内容不能超过 5000 个字符' },
  ],
  companionIds: [],
  attachments: [],
};

function applyRecord(value: SealBorrowRecord): void {
  record.value = value;
  Object.assign(form, {
    useDate: value.useDate,
    plannedReturnDate: value.plannedReturnDate,
    companionIds: [...value.companionIds],
    destination: value.destination,
    sealAssetNames: [...value.sealAssetNames],
    content: value.content,
    attachments: [...value.attachments],
  });
}

function toInput(): SealBorrowInput {
  return {
    useDate: form.useDate,
    plannedReturnDate: form.plannedReturnDate,
    companionIds: [...form.companionIds],
    destination: form.destination.trim(),
    sealAssetNames: form.sealAssetNames
      .map((name) => name.trim())
      .filter((name) => name.length > 0),
    content: form.content.trim(),
    attachments: [...form.attachments],
  };
}

function setError(error: unknown): void {
  errorMessage.value = error instanceof Error ? error.message : '请求失败，请稍后重试';
}

async function loadExisting(): Promise<void> {
  if (!currentId.value) return;
  const [response, loadedOverview] = await Promise.all([
    getSealBorrow(currentId.value),
    workflow.loadOverview(currentId.value),
  ]);
  applyRecord(response.data);
  responseDocument.value = response.document;
  overview.value = loadedOverview;
}

async function refreshOverview(): Promise<void> {
  if (currentId.value) {
    overview.value = await workflow.loadOverview(currentId.value);
  }
}

async function refreshDocumentList(): Promise<void> {
  try {
    await workflow.refresh();
  } catch {
    // The saved document remains valid even if the workspace refresh fails.
  }
}

async function persist(): Promise<{ id: string; created: boolean }> {
  await formRef.value?.validate();
  const created = !currentId.value;
  const response = await saveSealBorrow(toInput(), currentId.value || undefined);
  currentId.value = response.data.id;
  applyRecord(response.data);
  responseDocument.value = response.document;
  return { id: response.data.id, created };
}

async function saveDraft(): Promise<void> {
  saving.value = true;
  errorMessage.value = '';
  try {
    const result = await persist();
    await refreshOverview();
    await refreshDocumentList();
    message.success('外借申请草稿已保存');
    if (result.created) {
      await router.replace(`/seal/borrow/${result.id}/edit`);
    }
  } catch (error) {
    setError(error);
  } finally {
    saving.value = false;
  }
}

async function saveAndSubmit(): Promise<void> {
  submitting.value = true;
  errorMessage.value = '';
  try {
    const result = await persist();
    await submitSealDocument(result.id);
    await refreshOverview();
    await refreshDocumentList();
    message.success('外借申请已提交审批');
    if (result.created) {
      await router.replace(`/seal/borrow/${result.id}/edit`);
    }
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
    await loadExisting();
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
    :revision="revision"
    :status="documentStatus"
    title="印章证照外借申请"
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

    <a-form
      ref="formRef"
      :disabled="!canEdit || busy"
      :model="form"
      :rules="rules"
      layout="vertical"
    >
      <SealApplicantSection
        :applicant-name="applicantName"
        :application-date="applicationDate"
        :department-name="departmentName"
      />

      <FormSection title="外借安排">
        <div class="seal-form-grid">
          <a-form-item label="使用日期" name="useDate">
            <a-date-picker
              v-model:value="form.useDate"
              style="width: 100%"
              value-format="YYYY-MM-DD"
            />
          </a-form-item>
          <a-form-item label="计划归还日期" name="plannedReturnDate">
            <a-date-picker
              v-model:value="form.plannedReturnDate"
              style="width: 100%"
              value-format="YYYY-MM-DD"
            />
          </a-form-item>
          <a-form-item class="seal-form-grid__full" label="陪同人" name="companionIds">
            <a-select
              v-model:value="form.companionIds"
              :options="companionOptions"
              allow-clear
              mode="multiple"
              option-filter-prop="label"
              placeholder="选择陪同人员"
              show-search
            />
          </a-form-item>
          <a-form-item class="seal-form-grid__full" label="前往地点" name="destination">
            <a-input v-model:value="form.destination" :maxlength="300" show-count />
          </a-form-item>
        </div>
      </FormSection>

      <FormSection title="印章证照">
        <a-form-item label="印章证照名称" name="sealAssetNames">
          <a-select
            v-model:value="form.sealAssetNames"
            :open="false"
            :token-separators="['，', ',', '、']"
            allow-clear
            mode="tags"
            placeholder="输入印章或证照名称，回车添加"
          />
        </a-form-item>
      </FormSection>

      <FormSection title="申请内容">
        <a-form-item label="申请内容" name="content">
          <a-textarea v-model:value="form.content" :maxlength="5000" :rows="7" show-count />
        </a-form-item>
      </FormSection>

      <FormSection title="相关附件">
        <a-form-item name="attachments">
          <SealAttachmentsField v-model="form.attachments" :editable="canEdit && !busy" />
        </a-form-item>
      </FormSection>
    </a-form>

    <template #aside>
      <WorkflowSidebar :loading="loading" :overview="overview" />
    </template>

    <template #actions>
      <div class="seal-action-row">
        <a-button @click="router.push('/seal')">
          <template #icon><ArrowLeftOutlined /></template>
          返回
        </a-button>
        <div class="seal-action-row__primary">
          <a-button
            v-if="canExecute"
            type="primary"
            @click="router.push(`/seal/execution/SEAL_BORROW/${currentId}`)"
          >
            <template #icon><CheckOutlined /></template>
            执行登记
          </a-button>
          <template v-if="canEdit">
            <a-button :loading="saving" @click="saveDraft">
              <template #icon><SaveOutlined /></template>
              保存草稿
            </a-button>
            <a-button :loading="submitting" type="primary" @click="saveAndSubmit">
              <template #icon><SendOutlined /></template>
              保存并提交
            </a-button>
          </template>
        </div>
      </div>
    </template>
  </DocumentFormLayout>
</template>

<style scoped>
.seal-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 20px;
}

.seal-form-grid__full {
  grid-column: 1 / -1;
}

.seal-action-row {
  align-items: center;
  display: flex;
  justify-content: space-between;
  width: 100%;
}

.seal-action-row__primary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

@media (max-width: 767px) {
  .seal-form-grid {
    grid-template-columns: 1fr;
  }

  .seal-form-grid__full {
    grid-column: auto;
  }

  .seal-action-row {
    align-items: stretch;
    flex-direction: column-reverse;
    gap: 8px;
  }

  .seal-action-row__primary > :deep(.ant-btn),
  .seal-action-row > :deep(.ant-btn) {
    flex: 1;
  }
}
</style>
