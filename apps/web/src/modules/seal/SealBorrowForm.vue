<script setup lang="ts">
import { Delete, Plus } from '@element-plus/icons-vue';
import type { WorkflowOverview } from '@oa/contracts';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import DocumentFormLayout from '../../shared/components/DocumentFormLayout.vue';
import FormSection from '../../shared/components/FormSection.vue';
import WorkflowSidebar from '../../shared/components/WorkflowSidebar.vue';
import { todayIso } from '../../shared/format';
import { useSessionStore } from '../../shared/session';
import { useWorkflowStore } from '../../shared/workflow';
import { useLayoutMode } from '../../ui/useLayoutMode';
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
const { isCompact } = useLayoutMode();
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
  submitTo: '',
  sealCategories: [],
  sealTakeout: false,
  licenseTakeout: false,
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

const rules: FormRules<SealBorrowInput> = {
  useDate: [{ required: true, message: '请选择使用日期' }],
  plannedReturnDate: [
    { required: true, message: '请选择计划归还日期' },
    {
      validator: (_rule, _value, callback) => {
        if (form.useDate && form.plannedReturnDate < form.useDate) {
          callback(new Error('计划归还日期不能早于使用日期'));
          return;
        }
        callback();
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
      validator: (_rule, _value, callback) => {
        if (form.sealAssetNames.some((name) => name.trim().length > 200)) {
          callback(new Error('单项名称不能超过 200 个字符'));
          return;
        }
        callback();
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
    submitTo: value.submitTo ?? '',
    sealCategories: (value.sealCategories ?? []).map((entry) => ({ ...entry })),
    sealTakeout: Boolean(value.sealTakeout),
    licenseTakeout: Boolean(value.licenseTakeout),
    attachments: [...value.attachments],
  });
}

function addSealCategory(): void {
  form.sealCategories = [...form.sealCategories, { name: '饭店章', copies: 1 }];
}

function removeSealCategory(index: number): void {
  form.sealCategories = form.sealCategories.filter((_, current) => current !== index);
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
    submitTo: form.submitTo.trim(),
    sealCategories: form.sealCategories
      .filter((entry) => entry.name.trim().length > 0)
      .map((entry) => ({ name: entry.name.trim(), copies: entry.copies })),
    sealTakeout: form.sealTakeout,
    licenseTakeout: form.licenseTakeout,
    attachments: [...form.attachments],
  };
}

// 输入框内以「，」「,」「、」分隔的名称按多项保存，与标签输入的历史行为一致。
function normalizeAssetNames(): void {
  const names = form.sealAssetNames.flatMap((name) => name.split(/[，,、]/));
  form.sealAssetNames = [...new Set(names)];
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
    ElMessage.success('外借申请草稿已保存');
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
    ElMessage.success('外借申请已提交审批');
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
      <el-button @click="router.push('/seal')">返回台账</el-button>
    </template>

    <el-alert v-if="errorMessage" :closable="false" :title="errorMessage" show-icon type="error" />

    <el-form
      ref="formRef"
      :disabled="!canEdit || busy"
      :model="form"
      :rules="rules"
      label-position="top"
      @submit.prevent
    >
      <SealApplicantSection
        :applicant-name="applicantName"
        :application-date="applicationDate"
        :department-name="departmentName"
      />

      <FormSection title="外借安排">
        <div class="ui-fields">
          <el-form-item label="使用日期" prop="useDate">
            <el-date-picker
              v-model="form.useDate"
              format="YYYY-MM-DD"
              placeholder="请选择使用日期"
              type="date"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
          <el-form-item label="计划归还日期" prop="plannedReturnDate">
            <el-date-picker
              v-model="form.plannedReturnDate"
              format="YYYY-MM-DD"
              placeholder="请选择计划归还日期"
              type="date"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
          <el-form-item class="ui-field-full" label="陪同人" prop="companionIds">
            <el-select
              v-model="form.companionIds"
              clearable
              filterable
              multiple
              placeholder="选择陪同人员"
            >
              <el-option
                v-for="option in companionOptions"
                :key="option.value"
                :label="option.label"
                :value="option.value"
              />
            </el-select>
          </el-form-item>
          <el-form-item class="ui-field-full" label="前往地点" prop="destination">
            <el-input
              v-model="form.destination"
              :maxlength="300"
              placeholder="请输入前往地点"
              show-word-limit
            />
          </el-form-item>
        </div>
      </FormSection>

      <FormSection title="报送与外带">
        <div class="ui-fields">
          <el-form-item label="报送单位" prop="submitTo">
            <el-input v-model="form.submitTo" :maxlength="200" placeholder="如：市场监督管理局 / 客户单位" />
          </el-form-item>
          <el-form-item label="公章外带" prop="sealTakeout">
            <el-radio-group v-model="form.sealTakeout" :disabled="!canEdit">
              <el-radio-button :value="false">否</el-radio-button>
              <el-radio-button :value="true">是</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="证照外带" prop="licenseTakeout">
            <el-radio-group v-model="form.licenseTakeout" :disabled="!canEdit">
              <el-radio-button :value="false">否</el-radio-button>
              <el-radio-button :value="true">是</el-radio-button>
            </el-radio-group>
          </el-form-item>
        </div>
        <div class="seal-categories">
          <div class="seal-categories__head">
            <span>用章类别及数量</span>
            <el-button :disabled="!canEdit" :icon="Plus" text @click="addSealCategory">添加用章类别</el-button>
          </div>
          <div v-for="(entry, index) in form.sealCategories" :key="index" class="seal-categories__row">
            <el-input v-model="entry.name" :disabled="!canEdit" :maxlength="100" placeholder="如：饭店章 / 党委章" aria-label="用章类别" />
            <el-input-number v-model="entry.copies" :disabled="!canEdit" :min="0" :precision="0" aria-label="盖章数" />
            <el-button :disabled="!canEdit" :icon="Delete" text type="danger" :aria-label="`删除第 ${index + 1} 项用章类别`" @click="removeSealCategory(index)" />
          </div>
          <p v-if="form.sealCategories.length === 0" class="ui-text-muted">如需登记盖章数量，请添加用章类别。</p>
        </div>
      </FormSection>

      <FormSection title="印章证照">
        <el-form-item label="印章证照名称" prop="sealAssetNames">
          <el-select
            v-model="form.sealAssetNames"
            allow-create
            clearable
            default-first-option
            filterable
            multiple
            no-data-text="输入印章或证照名称后回车添加"
            placeholder="输入印章或证照名称，回车添加"
            :reserve-keyword="false"
            @change="normalizeAssetNames"
          />
        </el-form-item>
      </FormSection>

      <FormSection title="申请内容">
        <el-form-item label="申请内容" prop="content">
          <el-input
            v-model="form.content"
            :maxlength="5000"
            placeholder="请输入申请内容"
            :rows="7"
            show-word-limit
            type="textarea"
          />
        </el-form-item>
      </FormSection>

      <FormSection title="相关附件">
        <el-form-item prop="attachments">
          <SealAttachmentsField v-model="form.attachments" :editable="canEdit && !busy" />
        </el-form-item>
      </FormSection>
    </el-form>

    <template #aside>
      <WorkflowSidebar :loading="loading" :overview="overview" />
    </template>

    <template #actions>
      <div class="seal-actions" :data-compact="isCompact">
        <el-button @click="router.push('/seal')">返回</el-button>
        <div class="seal-actions__primary">
          <el-button
            v-if="canExecute"
            type="primary"
            @click="router.push(`/seal/execution/SEAL_BORROW/${currentId}`)"
          >
            执行登记
          </el-button>
          <template v-if="canEdit">
            <el-button :loading="saving" @click="saveDraft">保存草稿</el-button>
            <el-button :loading="submitting" type="primary" @click="saveAndSubmit">
              保存并提交
            </el-button>
          </template>
        </div>
      </div>
    </template>
  </DocumentFormLayout>
</template>

<style scoped>
.seal-categories { display: grid; gap: 10px; margin-top: 8px; }
.seal-categories__head { display: flex; align-items: center; justify-content: space-between; color: var(--color-text-tertiary); font-size: 13px; }
.seal-categories__row { display: grid; grid-template-columns: minmax(0, 1fr) 140px 40px; align-items: center; gap: 8px; }
html[data-layout='compact'] .seal-categories__row { grid-template-columns: minmax(0, 1fr) 110px 40px; }
.seal-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
}

.seal-actions__primary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.seal-actions[data-compact='true'] {
  flex-direction: column-reverse;
  align-items: stretch;
}

.seal-actions[data-compact='true'] :deep(.el-button) {
  flex: 1 1 auto;
}
</style>
