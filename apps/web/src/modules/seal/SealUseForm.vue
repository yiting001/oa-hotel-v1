<script setup lang="ts">
import { Delete, Plus } from '@element-plus/icons-vue';
import type { WorkflowOverview } from '@oa/contracts';
import { ElMessage } from 'element-plus';
import type { FormInstance, FormRules } from 'element-plus';
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import DocumentFormLayout from '../../shared/components/DocumentFormLayout.vue';
import FormSection from '../../shared/components/FormSection.vue';
import WorkflowSidebar from '../../shared/components/WorkflowSidebar.vue';
import { todayIso } from '../../shared/format';
import { useSessionStore } from '../../shared/session';
import { useWorkflowStore } from '../../shared/workflow';
import { useLayoutMode } from '../../ui/useLayoutMode';
import SealApplicantSection from './SealApplicantSection.vue';
import AttachmentUploadField from '../../shared/components/AttachmentUploadField.vue';
import { getSealUse, saveSealUse, submitSealDocument } from './seal.api';
import type { SealUseInput, SealUseRecord } from './seal.types';
import { useSealResources } from './useSealResources';

const props = defineProps<{ documentId?: string }>();
const router = useRouter();
const session = useSessionStore();
const workflow = useWorkflowStore();
const resources = useSealResources();
const { isCompact } = useLayoutMode();
const formRef = ref<FormInstance>();
const currentId = ref(props.documentId ?? '');
const record = ref<SealUseRecord | null>(null);
const overview = ref<WorkflowOverview | null>(null);
const responseDocument = ref<{ status: string; revision: number } | null>(null);
const loading = ref(false);
const saving = ref(false);
const submitting = ref(false);
const errorMessage = ref('');

const form = reactive<SealUseInput>({
  useDate: '',
  plannedReturnDate: '',
  purpose: '',
  sealAssetNames: [],
  content: '',
  submitTo: '',
  sealCategories: [],
  sealTakeout: false,
  licenseTakeout: false,
  attachments: [],
});

// 不外带时清空归还日期，避免残留到提交载荷
watch(
  () => form.sealTakeout,
  (takeout) => {
    if (!takeout) form.plannedReturnDate = '';
  },
);

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

/** 用章类别固定四选一：公章 / 合同章 / 部门章 / 党支部章。 */
const sealCategoryOptions = ['公章', '合同章', '部门章', '党支部章'] as const;

const rules: FormRules<SealUseInput> = {
  useDate: [{ required: true, message: '请选择使用日期' }],
  purpose: [
    { required: true, whitespace: true, message: '请输入用途' },
    { max: 1000, message: '用途不能超过 1000 个字符' },
  ],
  sealCategories: [{ required: true, type: 'array', min: 1, message: '请至少选择一项用章类别' }],
  content: [
    { required: true, whitespace: true, message: '请输入申请内容' },
    { max: 5000, message: '申请内容不能超过 5000 个字符' },
  ],
  plannedReturnDate: [
    {
      validator: (_rule, _value, callback) => {
        if (!form.sealTakeout) return callback();
        if (!form.plannedReturnDate) return callback(new Error('公章外带时必须填写归还日期'));
        if (form.useDate && form.plannedReturnDate < form.useDate) {
          return callback(new Error('归还日期不能早于使用日期'));
        }
        callback();
      },
    },
  ],
  attachments: [],
};

function applyRecord(value: SealUseRecord): void {
  record.value = value;
  Object.assign(form, {
    useDate: value.useDate,
    plannedReturnDate: value.plannedReturnDate ?? '',
    purpose: value.purpose,
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
  form.sealCategories = [...form.sealCategories, { name: '公章', copies: 1 }];
}

function removeSealCategory(index: number): void {
  form.sealCategories = form.sealCategories.filter((_, current) => current !== index);
}

function toInput(): SealUseInput {
  const categoryNames = form.sealCategories
    .map((entry) => entry.name.trim())
    .filter((name) => name.length > 0);
  return {
    useDate: form.useDate,
    plannedReturnDate: form.sealTakeout ? form.plannedReturnDate || null : null,
    purpose: form.purpose.trim(),
    // 印章名称由用章类别带出，避免重复填写
    sealAssetNames: [...new Set(categoryNames)],
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

function setError(error: unknown): void {
  errorMessage.value = error instanceof Error ? error.message : '请求失败，请稍后重试';
}

async function loadExisting(): Promise<void> {
  if (!currentId.value) return;
  const [response, loadedOverview] = await Promise.all([
    getSealUse(currentId.value),
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

/** 用章类别行不在 el-form-item 上，保存前单独校验，避免后端返回原始字段错误。 */
function validateSealCategories(): void {
  const rows = form.sealCategories.filter((entry) => entry.name.trim().length > 0);
  if (rows.length === 0) {
    throw new Error('请至少选择一项用章类别（公章 / 合同章 / 部门章 / 党支部章）');
  }
}

async function persist(): Promise<{ id: string; created: boolean }> {
  await formRef.value?.validate();
  validateSealCategories();
  const created = !currentId.value;
  const response = await saveSealUse(toInput(), currentId.value || undefined);
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
    ElMessage.success('用印申请草稿已保存');
    if (result.created) {
      await router.replace(`/seal/use/${result.id}/edit`);
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
    ElMessage.success('用印申请已提交审批');
    if (result.created) {
      await router.replace(`/seal/use/${result.id}/edit`);
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
    eyebrow="行政管理"
    title="印章使用申请"
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

      <FormSection title="用印安排">
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
          <el-form-item label="用途" prop="purpose">
            <el-input
              v-model="form.purpose"
              :maxlength="1000"
              placeholder="请输入用途"
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
          <el-form-item v-if="form.sealTakeout" label="归还日期" prop="plannedReturnDate">
            <el-date-picker
              v-model="form.plannedReturnDate"
              format="YYYY-MM-DD"
              placeholder="请选择归还日期"
              type="date"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
        </div>
        <div class="seal-categories">
          <div class="seal-categories__head">
            <span class="seal-categories__title">用章类别及数量</span>
            <el-button :disabled="!canEdit" :icon="Plus" text @click="addSealCategory">添加用章类别</el-button>
          </div>
          <div v-for="(entry, index) in form.sealCategories" :key="index" class="seal-categories__row">
            <el-select v-model="entry.name" :disabled="!canEdit" filterable placeholder="选择用章类别" aria-label="用章类别">
              <el-option v-for="option in sealCategoryOptions" :key="option" :label="option" :value="option" />
            </el-select>
            <el-input-number v-model="entry.copies" :disabled="!canEdit" :min="0" :precision="0" aria-label="盖章数" />
            <el-button :disabled="!canEdit" :icon="Delete" text type="danger" :aria-label="`删除第 ${index + 1} 项用章类别`" @click="removeSealCategory(index)" />
          </div>
          <p v-if="form.sealCategories.length === 0" class="ui-text-muted">请添加用章类别并填写盖章数量。</p>
        </div>
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
          <AttachmentUploadField v-model="form.attachments" :readonly="!canEdit || busy" />
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
            @click="router.push(`/seal/execution/SEAL_USE/${currentId}`)"
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
.seal-categories__title::before { content: '*'; margin-right: 4px; color: var(--el-color-danger); }
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
