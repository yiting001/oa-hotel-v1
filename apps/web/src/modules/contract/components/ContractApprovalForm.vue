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
import { useWorkflowStore } from '../../../shared/workflow';
import { CONTRACT_API, CONTRACT_ROUTE_NAMES } from '../contract.config';
import type { ContractApprovalData, ContractApprovalPayload, EditorMode } from '../contract.types';
import { useContractDocumentEditor } from '../useContractDocumentEditor';
import ContractDocumentActions from './ContractDocumentActions.vue';

const props = defineProps<{ mode: EditorMode; documentId?: string }>();
const formRef = ref<FormInstance>();
const session = useSessionStore();
const directory = useDirectoryStore();
const workflow = useWorkflowStore();

const form = reactive<ContractApprovalPayload>({
  requestId: null,
  signingDepartmentId: '',
  signingDate: todayIso(),
  name: '',
  amountCents: 0,
  counterpartyFullName: '',
  contentReason: '',
  needsSeal: false,
  attachments: [],
});

const rules: Record<keyof ContractApprovalPayload, Rule[]> = {
  requestId: [],
  signingDepartmentId: [{ required: true, message: '请选择签约部门' }],
  signingDate: [{ required: true, message: '请选择签约日期' }],
  name: [
    { required: true, whitespace: true, message: '请输入合同/协议名称' },
    { max: 200, message: '合同/协议名称不能超过 200 个字' },
  ],
  amountCents: [{ required: true, type: 'number', min: 0, message: '合同金额不能小于 0' }],
  counterpartyFullName: [
    { required: true, whitespace: true, message: '请输入对方单位全称' },
    { max: 300, message: '对方单位全称不能超过 300 个字' },
  ],
  contentReason: [
    { required: true, whitespace: true, message: '请输入合同内容及签约理由' },
    { max: 5000, message: '合同内容及理由不能超过 5000 个字' },
  ],
  needsSeal: [],
  attachments: [],
};

const departmentOptions = computed(() =>
  directory.departments.map((department) => ({ label: department.name, value: department.id })),
);

const approvedRequestOptions = computed(() =>
  workflow.documents
    .filter(
      (document) => document.documentType === 'CONTRACT_REQUEST' && document.status === 'APPROVED',
    )
    .map((document) => ({ label: document.title, value: document.id })),
);

const editor = useContractDocumentEditor<ContractApprovalData, ContractApprovalPayload>({
  mode: props.mode,
  documentId: props.documentId,
  documentType: 'CONTRACT_APPROVAL',
  createPath: CONTRACT_API.approvals,
  itemPath: CONTRACT_API.approval,
  editRouteName: CONTRACT_ROUTE_NAMES.approvalEdit,
  validate: async () => {
    await formRef.value?.validate();
  },
  payload: () => ({ ...form, attachments: [...form.attachments] }),
  assign: (data) => {
    Object.assign(form, {
      requestId: data.requestId,
      signingDepartmentId: data.signingDepartmentId,
      signingDate: data.signingDate,
      name: data.name,
      amountCents: data.amountCents,
      counterpartyFullName: data.counterpartyFullName,
      contentReason: data.contentReason,
      needsSeal: data.needsSeal,
      attachments: [...data.attachments],
    });
  },
});

onMounted(() => {
  if (!form.signingDepartmentId && session.user?.departmentId) {
    form.signingDepartmentId = session.user.departmentId;
  }
  void editor.initialize([
    session.ensureSession().then(() => {
      if (!form.signingDepartmentId && session.user) {
        form.signingDepartmentId = session.user.departmentId;
      }
    }),
    directory.load(),
    workflow.refresh(),
  ]);
});
</script>

<template>
  <div class="contract-document-form">
    <DocumentFormLayout
      :description="
        props.mode === 'create' ? '合同或协议签订前的正式审批单' : '编辑合同或协议审批单'
      "
      :document-number="editor.documentNumber.value"
      :loading="editor.loading.value"
      :revision="editor.revision.value"
      :status="editor.status.value"
      :title="props.mode === 'create' ? '新建合同/协议审批' : '合同/协议审批'"
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
        <FormSection title="签约信息">
          <div class="contract-form-grid">
            <a-form-item label="合同编号">
              <div class="contract-readonly-value">
                {{ editor.documentNumber.value ?? '保存后自动生成' }}
              </div>
            </a-form-item>
            <a-form-item label="关联已审批请示" name="requestId">
              <a-select
                v-model:value="form.requestId"
                :filter-option="true"
                :options="approvedRequestOptions"
                allow-clear
                option-filter-prop="label"
                placeholder="可选，选择本人已通过的请示"
                show-search
              />
            </a-form-item>
            <a-form-item label="签约部门" name="signingDepartmentId">
              <a-select
                v-model:value="form.signingDepartmentId"
                :loading="directory.loading"
                :options="departmentOptions"
                option-filter-prop="label"
                placeholder="请选择签约部门"
                show-search
              />
            </a-form-item>
            <a-form-item label="签约日期" name="signingDate">
              <a-input v-model:value="form.signingDate" type="date" />
            </a-form-item>
            <a-form-item label="经办人">
              <div class="contract-readonly-value">{{ session.user?.displayName ?? '-' }}</div>
            </a-form-item>
            <a-form-item label="是否需要用印" name="needsSeal">
              <a-switch
                v-model:checked="form.needsSeal"
                checked-children="需要"
                un-checked-children="不需要"
              />
            </a-form-item>
            <a-form-item class="contract-form-field--full" label="合同/协议名称" name="name">
              <a-input
                v-model:value="form.name"
                :maxlength="200"
                placeholder="请输入合同或协议的完整名称"
                show-count
              />
            </a-form-item>
          </div>
        </FormSection>

        <FormSection title="合同标的">
          <div class="contract-form-grid">
            <a-form-item label="合同金额" name="amountCents">
              <MoneyInput v-model="form.amountCents" aria-label="合同金额" />
              <span class="contract-field-note">零金额协议可填 0 元</span>
            </a-form-item>
            <a-form-item label="合同/协议对方单位全称" name="counterpartyFullName">
              <a-input
                v-model:value="form.counterpartyFullName"
                :maxlength="300"
                placeholder="请按证照登记名称完整填写"
              />
            </a-form-item>
            <a-form-item
              class="contract-form-field--full"
              label="合同/协议内容及理由"
              name="contentReason"
            >
              <a-textarea
                v-model:value="form.contentReason"
                :auto-size="{ minRows: 7, maxRows: 14 }"
                :maxlength="5000"
                placeholder="请说明合同标的、主要权利义务、履行周期及签约理由"
                show-count
              />
            </a-form-item>
          </div>
        </FormSection>

        <FormSection title="合同文件与附件">
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
