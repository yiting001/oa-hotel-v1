<script setup lang="ts">
import type { FormInstance } from 'ant-design-vue';
import type { Rule } from 'ant-design-vue/es/form';
import { onMounted, reactive, ref } from 'vue';
import AttachmentField from '../../../shared/components/AttachmentField.vue';
import DocumentFormLayout from '../../../shared/components/DocumentFormLayout.vue';
import FormSection from '../../../shared/components/FormSection.vue';
import MoneyInput from '../../../shared/components/MoneyInput.vue';
import WorkflowSidebar from '../../../shared/components/WorkflowSidebar.vue';
import { useSessionStore } from '../../../shared/session';
import { useWorkflowStore } from '../../../shared/workflow';
import ContractDocumentActions from '../../contract/components/ContractDocumentActions.vue';
import type { EditorMode } from '../../contract/contract.types';
import { useContractDocumentEditor } from '../../contract/useContractDocumentEditor';
import { PURCHASE_API, PURCHASE_ROUTE_NAMES } from '../purchase.config';
import type { PurchaseData, PurchasePayload } from '../purchase.types';

const props = defineProps<{ mode: EditorMode; documentId?: string }>();
const formRef = ref<FormInstance>();
const session = useSessionStore();
const workflow = useWorkflowStore();

const form = reactive<PurchasePayload>({
  name: '',
  amountCents: 0,
  counterpartyName: '',
  counterpartyContact: null,
  counterpartyPhone: null,
  paymentMethod: null,
  expectedDeliveryDate: null,
  remark: null,
  attachments: [],
});

const rules: Record<keyof PurchasePayload, Rule[]> = {
  name: [
    { required: true, whitespace: true, message: '请输入采购名称' },
    { max: 200, message: '采购名称不能超过 200 个字' },
  ],
  amountCents: [{ required: true, type: 'number', min: 0, message: '采购金额不能小于 0' }],
  counterpartyName: [
    { required: true, whitespace: true, message: '请输入乙方单位' },
    { max: 300, message: '乙方单位不能超过 300 个字' },
  ],
  counterpartyContact: [{ max: 100, message: '乙方联系人不能超过 100 个字' }],
  counterpartyPhone: [{ max: 50, message: '联系电话不能超过 50 个字' }],
  paymentMethod: [{ max: 100, message: '付款方式不能超过 100 个字' }],
  expectedDeliveryDate: [],
  remark: [{ max: 1000, message: '备注不能超过 1000 个字' }],
  attachments: [],
};

const editor = useContractDocumentEditor<PurchaseData, PurchasePayload>({
  mode: props.mode,
  documentId: props.documentId,
  documentType: 'PURCHASE_APPROVAL',
  createPath: PURCHASE_API.purchases,
  itemPath: PURCHASE_API.purchase,
  editRouteName: PURCHASE_ROUTE_NAMES.edit,
  listRouteName: PURCHASE_ROUTE_NAMES.list,
  validate: async () => {
    await formRef.value?.validate();
  },
  payload: () => ({ ...form, attachments: [...form.attachments] }),
  assign: (data) => {
    Object.assign(form, {
      name: data.name,
      amountCents: data.amountCents,
      counterpartyName: data.counterpartyName,
      counterpartyContact: data.counterpartyContact,
      counterpartyPhone: data.counterpartyPhone,
      paymentMethod: data.paymentMethod,
      expectedDeliveryDate: data.expectedDeliveryDate,
      remark: data.remark,
      attachments: [...data.attachments],
    });
  },
});

onMounted(() => {
  void editor.initialize([session.ensureSession(), workflow.refresh()]);
});
</script>

<template>
  <div class="contract-document-form">
    <DocumentFormLayout
      :description="props.mode === 'create' ? '采购事项的正式审批单' : '编辑采购审批单'"
      :document-number="editor.documentNumber.value"
      :loading="editor.loading.value"
      :revision="editor.revision.value"
      :status="editor.status.value"
      :title="props.mode === 'create' ? '新建采购审批' : '采购审批'"
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
        <FormSection title="采购信息">
          <div class="contract-form-grid">
            <a-form-item label="单据编号">
              <div class="contract-readonly-value">
                {{ editor.documentNumber.value ?? '提交后自动生成 CG 单号' }}
              </div>
            </a-form-item>
            <a-form-item label="经办人">
              <div class="contract-readonly-value">{{ session.user?.displayName ?? '-' }}</div>
            </a-form-item>
            <a-form-item class="contract-form-field--full" label="采购名称" name="name">
              <a-input
                v-model:value="form.name"
                :maxlength="200"
                placeholder="请输入采购事项名称"
                show-count
              />
            </a-form-item>
            <a-form-item label="采购金额" name="amountCents">
              <MoneyInput v-model="form.amountCents" aria-label="采购金额" />
            </a-form-item>
            <a-form-item label="乙方单位" name="counterpartyName">
              <a-input
                v-model:value="form.counterpartyName"
                :maxlength="300"
                placeholder="请按证照登记名称完整填写"
              />
            </a-form-item>
            <a-form-item label="乙方联系人" name="counterpartyContact">
              <a-input
                v-model:value="form.counterpartyContact"
                :maxlength="100"
                placeholder="请输入乙方联系人姓名"
              />
            </a-form-item>
            <a-form-item label="联系电话" name="counterpartyPhone">
              <a-input
                v-model:value="form.counterpartyPhone"
                :maxlength="50"
                placeholder="请输入乙方联系电话"
              />
            </a-form-item>
            <a-form-item label="付款方式" name="paymentMethod">
              <a-input
                v-model:value="form.paymentMethod"
                :maxlength="100"
                placeholder="如：银行转账、货到付款"
              />
            </a-form-item>
            <a-form-item label="期望到货时间" name="expectedDeliveryDate">
              <a-input v-model:value="form.expectedDeliveryDate" type="date" />
            </a-form-item>
            <a-form-item class="contract-form-field--full" label="备注" name="remark">
              <a-textarea
                v-model:value="form.remark"
                :auto-size="{ minRows: 3, maxRows: 6 }"
                :maxlength="1000"
                placeholder="可选，补充其他说明"
              />
            </a-form-item>
          </div>
        </FormSection>

        <FormSection title="附件">
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

<style scoped src="../../contract/contract-form.css"></style>
