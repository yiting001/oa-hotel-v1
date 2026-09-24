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
import { useWorkflowStore } from '../../../shared/workflow';
import { useLayoutMode } from '../../../ui/useLayoutMode';
import { CONTRACT_API, CONTRACT_ROUTE_NAMES } from '../contract.config';
import type { ContractApprovalData, ContractApprovalPayload, EditorMode } from '../contract.types';
import { useContractDocumentEditor, validateDocumentForm } from '../useContractDocumentEditor';
import ContractDocumentActions from './ContractDocumentActions.vue';

const props = defineProps<{ mode: EditorMode; documentId?: string }>();
const formRef = ref<FormInstance>();
const session = useSessionStore();
const directory = useDirectoryStore();
const workflow = useWorkflowStore();
const { isCompact } = useLayoutMode();
const form = reactive<ContractApprovalPayload>({
  requestId: null, signingDepartmentId: '', signingDate: todayIso(), name: '', amountCents: 0,
  counterpartyFullName: '', counterpartyContact: null, counterpartyPhone: null, paymentMethod: null,
  validFrom: null, validTo: null, contentReason: '', remark: null, needsSeal: false, attachments: [],
});
const rules: FormRules<ContractApprovalPayload> = {
  signingDepartmentId: [{ required: true, message: '请选择签约部门' }],
  signingDate: [{ required: true, message: '请选择签约日期' }],
  name: [{ required: true, whitespace: true, message: '请输入合同/协议名称' }, { max: 200, message: '合同/协议名称不能超过 200 个字' }],
  amountCents: [{ required: true, type: 'number', min: 0, message: '合同金额不能小于 0' }],
  counterpartyFullName: [{ required: true, whitespace: true, message: '请输入对方单位全称' }, { max: 300, message: '对方单位全称不能超过 300 个字' }],
  counterpartyContact: [{ max: 100, message: '乙方联系人不能超过 100 个字' }],
  counterpartyPhone: [{ max: 50, message: '联系电话不能超过 50 个字' }],
  paymentMethod: [{ max: 100, message: '付款方式不能超过 100 个字' }],
  remark: [{ max: 1000, message: '备注不能超过 1000 个字' }],
  contentReason: [{ required: true, whitespace: true, message: '请输入合同内容及签约理由' }, { max: 5000, message: '合同内容及理由不能超过 5000 个字' }],
};
const approvedRequestOptions = computed(() => workflow.documents
  .filter((document) => document.documentType === 'CONTRACT_REQUEST' && document.status === 'APPROVED')
  .map((document) => ({ label: document.title, value: document.id })));
const identityItems = computed(() => [
  { label: '合同编号', value: editor.documentNumber.value ?? '保存后自动生成' },
  { label: '经办人', value: session.user?.displayName ?? '-' },
]);
const editor = useContractDocumentEditor<ContractApprovalData, ContractApprovalPayload>({
  mode: props.mode,
  documentId: props.documentId,
  documentType: 'CONTRACT_APPROVAL',
  createPath: CONTRACT_API.approvals,
  itemPath: CONTRACT_API.approval,
  editRouteName: CONTRACT_ROUTE_NAMES.approvalEdit,
  validate: () => validateDocumentForm(formRef.value),
  payload: () => ({ ...form, requestId: form.requestId || null, validFrom: form.validFrom || null, validTo: form.validTo || null, attachments: [...form.attachments] }),
  assign: (data) => {
    Object.assign(form, {
      requestId: data.requestId, signingDepartmentId: data.signingDepartmentId, signingDate: data.signingDate || '',
      name: data.name, amountCents: data.amountCents, counterpartyFullName: data.counterpartyFullName,
      counterpartyContact: data.counterpartyContact, counterpartyPhone: data.counterpartyPhone,
      paymentMethod: data.paymentMethod, validFrom: data.validFrom, validTo: data.validTo,
      contentReason: data.contentReason, remark: data.remark, needsSeal: data.needsSeal,
      attachments: [...data.attachments],
    });
  },
});
onMounted(() => {
  if (!form.signingDepartmentId && session.user?.departmentId) form.signingDepartmentId = session.user.departmentId;
  void editor.initialize([
    session.ensureSession().then(() => { if (!form.signingDepartmentId && session.user) form.signingDepartmentId = session.user.departmentId; }),
    directory.load(), workflow.refresh(),
  ]);
});
</script>

<template>
  <div class="contract-document-form">
    <DocumentFormLayout :document-number="editor.documentNumber.value" :loading="editor.loading.value" :revision="editor.revision.value" :status="editor.status.value" eyebrow="合同管理" :title="props.mode === 'create' ? '新建合同/协议审批' : '合同/协议审批'">
      <el-alert v-if="!editor.editable.value" class="form-note" title="当前单据已进入流程，不可继续编辑。" show-icon type="info" :closable="false" />
      <el-form ref="formRef" :disabled="!editor.editable.value" :model="form" :rules="rules" label-position="top" @submit.prevent>
        <FormSection title="签约信息">
          <div class="ui-fields" :class="{ 'is-compact': isCompact }">
            <el-form-item class="ui-field-full" label="合同/协议名称" prop="name"><el-input v-model="form.name" :maxlength="200" placeholder="请输入合同或协议的完整名称" show-word-limit /></el-form-item>
            <el-form-item label="关联已审批请示" prop="requestId">
              <el-select :model-value="form.requestId" filterable clearable placeholder="可选，选择本人已通过的请示" @update:model-value="form.requestId = $event || null">
                <el-option v-for="option in approvedRequestOptions" :key="option.value" :label="option.label" :value="option.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="签约部门" prop="signingDepartmentId">
              <el-select v-model="form.signingDepartmentId" :loading="directory.loading" filterable placeholder="请选择签约部门">
                <el-option v-for="department in directory.departments" :key="department.id" :label="department.name" :value="department.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="签约日期" prop="signingDate"><el-date-picker :model-value="form.signingDate" format="YYYY/MM/DD" value-format="YYYY-MM-DD" placeholder="请选择签约日期" @update:model-value="form.signingDate = $event || ''" /></el-form-item>
            <el-form-item label="是否需要用印" prop="needsSeal"><el-switch v-model="form.needsSeal" active-text="需要" inactive-text="不需要" /></el-form-item>
          </div>
        </FormSection>
        <FormSection title="合同标的">
          <div class="ui-fields" :class="{ 'is-compact': isCompact }">
            <el-form-item label="合同金额" prop="amountCents"><MoneyInput v-model="form.amountCents" aria-label="合同金额" /><span class="contract-field-note">零金额协议可填 0 元</span></el-form-item>
            <el-form-item label="合同/协议对方单位全称" prop="counterpartyFullName"><el-input v-model="form.counterpartyFullName" :maxlength="300" placeholder="请按证照登记名称完整填写" /></el-form-item>
            <el-form-item label="乙方联系人" prop="counterpartyContact"><el-input v-model="form.counterpartyContact" :maxlength="100" placeholder="请输入乙方联系人姓名" /></el-form-item>
            <el-form-item label="联系电话" prop="counterpartyPhone"><el-input v-model="form.counterpartyPhone" :maxlength="50" placeholder="请输入乙方联系电话" /></el-form-item>
            <el-form-item label="付款方式" prop="paymentMethod"><el-input v-model="form.paymentMethod" :maxlength="100" placeholder="如：银行转账、分期付款" /></el-form-item>
            <el-form-item label="合同有效期开始" prop="validFrom"><el-date-picker :model-value="form.validFrom" format="YYYY/MM/DD" value-format="YYYY-MM-DD" placeholder="请选择开始日期" @update:model-value="form.validFrom = $event || null" /></el-form-item>
            <el-form-item label="合同有效期结束" prop="validTo"><el-date-picker :model-value="form.validTo" format="YYYY/MM/DD" value-format="YYYY-MM-DD" placeholder="请选择结束日期" @update:model-value="form.validTo = $event || null" /></el-form-item>
            <el-form-item class="ui-field-full" label="合同/协议内容及理由" prop="contentReason"><el-input v-model="form.contentReason" type="textarea" :autosize="{ minRows: isCompact ? 6 : 8, maxRows: 16 }" :maxlength="5000" placeholder="请说明合同标的、主要权利义务、履行周期及签约理由" show-word-limit /></el-form-item>
            <el-form-item class="ui-field-full" label="备注" prop="remark"><el-input v-model="form.remark" type="textarea" :autosize="{ minRows: 3, maxRows: 6 }" :maxlength="1000" placeholder="可选，补充其他说明" /></el-form-item>
          </div>
        </FormSection>
        <FormSection title="合同文件与附件"><el-form-item prop="attachments"><AttachmentField v-model="form.attachments" :readonly="!editor.editable.value" /></el-form-item></FormSection>
        <FormSection title="单据信息"><KeyValueSummary :items="identityItems" :columns="isCompact ? 1 : 2" /></FormSection>
      </el-form>
      <template #aside><WorkflowSidebar :loading="editor.loading.value" :overview="editor.overview.value" /></template>
      <template #actions><ContractDocumentActions :editable="editor.editable.value" :saving="editor.saving.value" :submitting="editor.submitting.value" @back="editor.backToList" @save="editor.saveDraft" @submit="editor.saveAndSubmit" /></template>
    </DocumentFormLayout>
  </div>
</template>

<style scoped src="../contract-form.css"></style>
