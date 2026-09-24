<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import AttachmentField from '../../../shared/components/AttachmentField.vue';
import DocumentFormLayout from '../../../shared/components/DocumentFormLayout.vue';
import FormSection from '../../../shared/components/FormSection.vue';
import KeyValueSummary from '../../../shared/components/KeyValueSummary.vue';
import MoneyInput from '../../../shared/components/MoneyInput.vue';
import WorkflowSidebar from '../../../shared/components/WorkflowSidebar.vue';
import { useDirectoryStore } from '../../../shared/directory';
import { todayIso } from '../../../shared/format';
import { useSessionStore } from '../../../shared/session';
import { useLayoutMode } from '../../../ui/useLayoutMode';
import { CONTRACT_API, CONTRACT_ROUTE_NAMES } from '../contract.config';
import type { ContractRequestData, ContractRequestPayload, EditorMode } from '../contract.types';
import { useContractDocumentEditor, validateDocumentForm } from '../useContractDocumentEditor';
import ContractDocumentActions from './ContractDocumentActions.vue';

const props = defineProps<{ mode: EditorMode; documentId?: string }>();
const formRef = ref<FormInstance>();
const session = useSessionStore();
const directory = useDirectoryStore();
const { isCompact } = useLayoutMode();
const form = reactive<ContractRequestPayload>({ title: '', requestedAt: todayIso(), amountCents: null, content: '', attachments: [] });
const rules: FormRules<ContractRequestPayload> = {
  title: [
    { required: true, whitespace: true, message: '请输入请示题目' },
    { max: 200, message: '请示题目不能超过 200 个字' },
  ],
  requestedAt: [{ required: true, message: '请选择请示日期' }],
  content: [
    { required: true, whitespace: true, message: '请输入请示内容' },
    { max: 5000, message: '请示内容不能超过 5000 个字' },
  ],
};
const departmentName = computed(() => directory.departments.find((department) => department.id === session.user?.departmentId)?.name ?? session.user?.departmentName ?? '-');
const editor = useContractDocumentEditor<ContractRequestData, ContractRequestPayload>({
  mode: props.mode,
  documentId: props.documentId,
  documentType: 'CONTRACT_REQUEST',
  createPath: CONTRACT_API.requests,
  itemPath: CONTRACT_API.request,
  editRouteName: CONTRACT_ROUTE_NAMES.requestEdit,
  validate: () => validateDocumentForm(formRef.value),
  payload: () => ({ ...form, requestedAt: form.requestedAt || '', attachments: [...form.attachments] }),
  assign: (data) => {
    Object.assign(form, { title: data.title, requestedAt: data.requestedAt || '', amountCents: data.amountCents, content: data.content, attachments: [...data.attachments] });
  },
});
const applicantSummary = computed(() => [
  { label: '请示编号', value: editor.documentNumber.value ?? '保存后自动生成' },
  { label: '申请部门', value: departmentName.value },
  { label: '申请人', value: session.user?.displayName ?? '-' },
]);
onMounted(() => { void editor.initialize([session.ensureSession(), directory.load()]); });
</script>

<template>
  <div class="contract-document-form">
    <DocumentFormLayout :document-number="editor.documentNumber.value" :loading="editor.loading.value" :revision="editor.revision.value" :status="editor.status.value" eyebrow="合同管理" :title="props.mode === 'create' ? '新建合同/支出请示' : '合同/支出请示'">
      <el-alert v-if="!editor.editable.value" class="form-note" title="当前单据已进入流程，不可继续编辑。" show-icon type="info" :closable="false" />
      <el-form ref="formRef" :disabled="!editor.editable.value" :model="form" :rules="rules" label-position="top" @submit.prevent>
        <FormSection title="请示事项">
          <div class="ui-fields" :class="{ 'is-compact': isCompact }">
            <el-form-item class="ui-field-full" label="请示题目" prop="title">
              <el-input v-model="form.title" :maxlength="200" placeholder="请输入请示题目" show-word-limit />
            </el-form-item>
            <el-form-item label="请示日期" prop="requestedAt">
              <el-date-picker :model-value="form.requestedAt" format="YYYY/MM/DD" value-format="YYYY-MM-DD" placeholder="请选择日期" @update:model-value="form.requestedAt = $event || ''" />
            </el-form-item>
            <el-form-item label="请示金额" prop="amountCents">
              <MoneyInput v-model="form.amountCents" aria-label="请示金额" />
              <span class="contract-field-note">非金额类请示可留空</span>
            </el-form-item>
            <el-form-item class="ui-field-full" label="请示内容" prop="content">
              <el-input v-model="form.content" type="textarea" :autosize="{ minRows: isCompact ? 6 : 8, maxRows: 16 }" :maxlength="5000" placeholder="请说明事项背景、必要性、实施方案及预期结果" show-word-limit />
            </el-form-item>
          </div>
        </FormSection>
        <FormSection title="附件材料">
          <el-form-item prop="attachments"><AttachmentField v-model="form.attachments" :readonly="!editor.editable.value" /></el-form-item>
        </FormSection>
        <FormSection title="申请信息"><KeyValueSummary :items="applicantSummary" :columns="isCompact ? 1 : 3" /></FormSection>
      </el-form>
      <template #aside><WorkflowSidebar :loading="editor.loading.value" :overview="editor.overview.value" /></template>
      <template #actions><ContractDocumentActions :editable="editor.editable.value" :saving="editor.saving.value" :submitting="editor.submitting.value" @back="editor.backToList" @save="editor.saveDraft" @submit="editor.saveAndSubmit" /></template>
    </DocumentFormLayout>
  </div>
</template>

<style scoped src="../contract-form.css"></style>

<style scoped>
/* 整行字段里的单行输入跟随阅读宽度；多行文本域保持整行 */
:deep(.ui-field-full) .el-form-item__content > .el-input { flex: 0 0 auto; }
:deep(.ui-field-full) .el-input__wrapper { max-width: 720px; }
</style>
