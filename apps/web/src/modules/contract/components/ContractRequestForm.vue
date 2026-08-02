<script setup lang="ts">
import type { FormInstance } from 'ant-design-vue';
import type { Rule } from 'ant-design-vue/es/form';
import { computed, onMounted, reactive, ref } from 'vue';
import AttachmentField from '../../../shared/components/AttachmentField.vue';
import DocumentFormLayout from '../../../shared/components/DocumentFormLayout.vue';
import FormSection from '../../../shared/components/FormSection.vue';
import MoneyInput from '../../../shared/components/MoneyInput.vue';
import WorkflowSidebar from '../../../shared/components/WorkflowSidebar.vue';
import { useDirectoryStore } from '../../../shared/directory';
import { todayIso } from '../../../shared/format';
import { useSessionStore } from '../../../shared/session';
import { CONTRACT_API, CONTRACT_ROUTE_NAMES } from '../contract.config';
import type { ContractRequestData, ContractRequestPayload, EditorMode } from '../contract.types';
import { useContractDocumentEditor } from '../useContractDocumentEditor';
import ContractDocumentActions from './ContractDocumentActions.vue';

const props = defineProps<{ mode: EditorMode; documentId?: string }>();
const formRef = ref<FormInstance>();
const session = useSessionStore();
const directory = useDirectoryStore();

const form = reactive<ContractRequestPayload>({
  title: '',
  requestedAt: todayIso(),
  amountCents: null,
  content: '',
  attachments: [],
});

const rules: Record<keyof ContractRequestPayload, Rule[]> = {
  title: [
    { required: true, whitespace: true, message: '请输入请示题目' },
    { max: 200, message: '请示题目不能超过 200 个字' },
  ],
  requestedAt: [{ required: true, message: '请选择请示日期' }],
  amountCents: [],
  content: [
    { required: true, whitespace: true, message: '请输入请示内容' },
    { max: 5000, message: '请示内容不能超过 5000 个字' },
  ],
  attachments: [],
};

const departmentName = computed(() => {
  const departmentId = session.user?.departmentId;
  return (
    directory.departments.find((department) => department.id === departmentId)?.name ??
    session.user?.departmentName ??
    '-'
  );
});

const editor = useContractDocumentEditor<ContractRequestData, ContractRequestPayload>({
  mode: props.mode,
  documentId: props.documentId,
  documentType: 'CONTRACT_REQUEST',
  createPath: CONTRACT_API.requests,
  itemPath: CONTRACT_API.request,
  editRouteName: CONTRACT_ROUTE_NAMES.requestEdit,
  validate: async () => {
    await formRef.value?.validate();
  },
  payload: () => ({ ...form, attachments: [...form.attachments] }),
  assign: (data) => {
    Object.assign(form, {
      title: data.title,
      requestedAt: data.requestedAt,
      amountCents: data.amountCents,
      content: data.content,
      attachments: [...data.attachments],
    });
  },
});

onMounted(() => {
  void editor.initialize([session.ensureSession(), directory.load()]);
});
</script>

<template>
  <div class="contract-document-form">
    <DocumentFormLayout
      :description="props.mode === 'create' ? '合同签订或支出事项的前置请示' : '编辑合同或支出请示'"
      :document-number="editor.documentNumber.value"
      :loading="editor.loading.value"
      :revision="editor.revision.value"
      :status="editor.status.value"
      :title="props.mode === 'create' ? '新建合同/支出请示' : '合同/支出请示'"
    >
      <a-alert
        v-if="!editor.editable.value"
        message="当前单据已进入流程，不可继续编辑。"
        show-icon
        type="info"
      />

      <a-form
        ref="formRef"
        :disabled="!editor.editable.value"
        :model="form"
        :rules="rules"
        layout="vertical"
      >
        <FormSection title="申请信息">
          <div class="contract-form-grid">
            <a-form-item label="请示编号">
              <div class="contract-readonly-value">
                {{ editor.documentNumber.value ?? '保存后自动生成' }}
              </div>
            </a-form-item>
            <a-form-item label="请示日期" name="requestedAt">
              <a-input v-model:value="form.requestedAt" type="date" />
            </a-form-item>
            <a-form-item label="申请部门">
              <div class="contract-readonly-value">{{ departmentName }}</div>
            </a-form-item>
            <a-form-item label="申请人">
              <div class="contract-readonly-value">{{ session.user?.displayName ?? '-' }}</div>
            </a-form-item>
            <a-form-item class="contract-form-field--full" label="请示题目" name="title">
              <a-input
                v-model:value="form.title"
                :maxlength="200"
                placeholder="请输入请示题目"
                show-count
              />
            </a-form-item>
          </div>
        </FormSection>

        <FormSection title="请示事项">
          <div class="contract-form-grid">
            <a-form-item label="请示金额" name="amountCents">
              <MoneyInput v-model="form.amountCents" aria-label="请示金额" />
              <span class="contract-field-note">非金额类请示可留空</span>
            </a-form-item>
            <a-form-item class="contract-form-field--full" label="请示内容" name="content">
              <a-textarea
                v-model:value="form.content"
                :auto-size="{ minRows: 7, maxRows: 14 }"
                :maxlength="5000"
                placeholder="请说明事项背景、必要性、实施方案及预期结果"
                show-count
              />
            </a-form-item>
          </div>
        </FormSection>

        <FormSection title="附件材料">
          <a-form-item name="attachments">
            <AttachmentField v-model="form.attachments" />
          </a-form-item>
        </FormSection>
      </a-form>

      <template #aside>
        <WorkflowSidebar :loading="editor.loading.value" :overview="editor.overview.value" />
      </template>

      <template #actions>
        <ContractDocumentActions
          :editable="editor.editable.value"
          :saving="editor.saving.value"
          :submitting="editor.submitting.value"
          @back="editor.backToList"
          @save="editor.saveDraft"
          @submit="editor.saveAndSubmit"
        />
      </template>
    </DocumentFormLayout>
  </div>
</template>

<style scoped src="../contract-form.css"></style>
