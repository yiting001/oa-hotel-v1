<script setup lang="ts">
import type { FormInstance } from 'ant-design-vue';
import { computed, onMounted, reactive, ref } from 'vue';
import { apiRequest, type ApiEnvelope } from '../../../shared/api';
import AttachmentField from '../../../shared/components/AttachmentField.vue';
import DocumentFormLayout from '../../../shared/components/DocumentFormLayout.vue';
import FormSection from '../../../shared/components/FormSection.vue';
import MoneyInput from '../../../shared/components/MoneyInput.vue';
import WorkflowSidebar from '../../../shared/components/WorkflowSidebar.vue';
import { useDirectoryStore } from '../../../shared/directory';
import { formatMoney } from '../../../shared/format';
import { useSessionStore } from '../../../shared/session';
import {
  CONTRACT_API,
  CONTRACT_ROUTE_NAMES,
  PAYMENT_METHOD_OPTIONS,
  PAYMENT_METHODS_REQUIRING_INSTRUMENT_NUMBER,
  type PaymentMethod,
} from '../contract.config';
import { createContractPaymentRules, parsePaymentProgress } from '../contract-payment.rules';
import type {
  ContractApprovalData,
  ContractPaymentData,
  ContractPaymentPayload,
  EditorMode,
} from '../contract.types';
import { useContractDocumentEditor } from '../useContractDocumentEditor';
import ContractDocumentActions from './ContractDocumentActions.vue';

const props = defineProps<{ mode: EditorMode; documentId?: string }>();
const formRef = ref<FormInstance>();
const session = useSessionStore();
const directory = useDirectoryStore();
const approvedContracts = ref<Array<ApiEnvelope<ContractApprovalData>>>([]);
const paymentAmountUppercase = ref('');

const form = reactive<ContractPaymentPayload>({
  contractId: '',
  project: '',
  contractStartDate: '',
  contractEndDate: '',
  contractSigningDate: '',
  contractAmountCents: 0,
  budgetAmountCents: 0,
  budgetExecutedCents: 0,
  accountingSubject: '',
  maintenanceEstimateCents: null,
  counterpartyFullName: '',
  plannedPaymentCount: 1,
  paymentSequence: 1,
  executedAmountCents: 0,
  plannedProgress: '',
  actualProgress: '',
  paymentMethod: '',
  paymentReason: '',
  invoiceNumber: null,
  warrantyStartDate: null,
  warrantyEndDate: null,
  paymentAmountCents: 0,
  attachments: [],
});

const rules = createContractPaymentRules(form);

const departmentName = computed(() => {
  const departmentId = session.user?.departmentId;
  return (
    directory.departments.find((department) => department.id === departmentId)?.name ??
    session.user?.departmentName ??
    '-'
  );
});

const contractOptions = computed(() =>
  approvedContracts.value.map(({ data }) => ({
    label: `${data.number} · ${data.name} · ${data.counterpartyFullName}`,
    value: data.id,
  })),
);

const requiresInstrumentNumber = computed(() =>
  PAYMENT_METHODS_REQUIRING_INSTRUMENT_NUMBER.includes(form.paymentMethod as PaymentMethod),
);
const contractBalanceCents = computed(() => form.contractAmountCents - form.executedAmountCents);
const remainingAfterPaymentCents = computed(
  () => contractBalanceCents.value - form.paymentAmountCents,
);
const budgetRemainingCents = computed(
  () => form.budgetAmountCents - form.budgetExecutedCents - form.paymentAmountCents,
);
const progressVariance = computed(() => {
  const planned = parsePaymentProgress(form.plannedProgress);
  const actual = parsePaymentProgress(form.actualProgress);
  return planned === null || actual === null ? '-' : `${(actual - planned).toFixed(2)}%`;
});

const editor = useContractDocumentEditor<ContractPaymentData, ContractPaymentPayload>({
  mode: props.mode,
  documentId: props.documentId,
  documentType: 'CONTRACT_PAYMENT',
  createPath: CONTRACT_API.payments,
  itemPath: CONTRACT_API.payment,
  editRouteName: CONTRACT_ROUTE_NAMES.paymentEdit,
  validate: async () => {
    await formRef.value?.validate();
  },
  payload: () => ({
    ...form,
    invoiceNumber: form.invoiceNumber || null,
    warrantyStartDate: form.warrantyStartDate || null,
    warrantyEndDate: form.warrantyEndDate || null,
    attachments: [...form.attachments],
  }),
  assign: (data) => {
    Object.assign(form, {
      contractId: data.contractId,
      project: data.project,
      contractStartDate: data.contractStartDate,
      contractEndDate: data.contractEndDate,
      contractSigningDate: data.contractSigningDate,
      contractAmountCents: data.contractAmountCents,
      budgetAmountCents: data.budgetAmountCents,
      budgetExecutedCents: data.budgetExecutedCents,
      accountingSubject: data.accountingSubject,
      maintenanceEstimateCents: data.maintenanceEstimateCents,
      counterpartyFullName: data.counterpartyFullName,
      plannedPaymentCount: data.plannedPaymentCount,
      paymentSequence: data.paymentSequence,
      executedAmountCents: data.executedAmountCents,
      plannedProgress: data.plannedProgress,
      actualProgress: data.actualProgress,
      paymentMethod: data.paymentMethod,
      paymentReason: data.paymentReason,
      invoiceNumber: data.invoiceNumber,
      warrantyStartDate: data.warrantyStartDate,
      warrantyEndDate: data.warrantyEndDate,
      paymentAmountCents: data.paymentAmountCents,
      attachments: [...data.attachments],
    });
    paymentAmountUppercase.value = data.paymentAmountUppercase;
  },
});

async function loadApprovedContracts(): Promise<void> {
  approvedContracts.value = await apiRequest<Array<ApiEnvelope<ContractApprovalData>>>(
    CONTRACT_API.approvedContracts,
  );
}

function applyContractSnapshot(contractId: string): void {
  const contract = approvedContracts.value.find(({ data }) => data.id === contractId)?.data;
  if (!contract) {
    form.project = '';
    form.contractStartDate = '';
    form.contractEndDate = '';
    form.contractSigningDate = '';
    form.contractAmountCents = 0;
    form.counterpartyFullName = '';
    return;
  }
  // 付款单保存申请时快照，只复制已审批合同实际提供的字段。
  form.project = contract.name;
  form.contractStartDate = '';
  form.contractEndDate = '';
  form.contractSigningDate = contract.signingDate;
  form.contractAmountCents = contract.amountCents;
  form.counterpartyFullName = contract.counterpartyFullName;
  form.budgetAmountCents = 0;
  form.budgetExecutedCents = 0;
  form.executedAmountCents = 0;
  form.plannedPaymentCount = 1;
  form.paymentSequence = 1;
  form.paymentAmountCents = 0;
  paymentAmountUppercase.value = '';
}

function handlePaymentMethodChange(value: PaymentMethod): void {
  if (!PAYMENT_METHODS_REQUIRING_INSTRUMENT_NUMBER.includes(value)) {
    form.invoiceNumber = null;
  }
  void formRef.value?.validateFields('invoiceNumber');
}

onMounted(() => {
  void editor.initialize([session.ensureSession(), directory.load(), loadApprovedContracts()]);
});
</script>

<template>
  <div class="contract-document-form">
    <DocumentFormLayout
      :description="props.mode === 'create' ? '已审批合同的履约付款申请' : '编辑合同付款申请'"
      :document-number="editor.documentNumber.value"
      :loading="editor.loading.value"
      :revision="editor.revision.value"
      :status="editor.status.value"
      :title="props.mode === 'create' ? '新建合同/协议支出申请' : '合同/协议支出申请'"
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
            <a-form-item label="申请编号">
              <div class="contract-readonly-value">
                {{ editor.documentNumber.value ?? '保存后自动生成' }}
              </div>
            </a-form-item>
            <a-form-item label="申请部门">
              <div class="contract-readonly-value">{{ departmentName }}</div>
            </a-form-item>
            <a-form-item label="申请人">
              <div class="contract-readonly-value">{{ session.user?.displayName ?? '-' }}</div>
            </a-form-item>
            <a-form-item label="已审批合同" name="contractId">
              <a-select
                v-model:value="form.contractId"
                :options="contractOptions"
                option-filter-prop="label"
                placeholder="请选择已审批合同"
                show-search
                @change="applyContractSnapshot"
              />
            </a-form-item>
          </div>
        </FormSection>

        <FormSection title="合同快照">
          <a-alert
            message="合同审批记录尚未存储履约起止日期，请根据合同正文补录并核对。"
            show-icon
            type="warning"
          />
          <div class="contract-form-grid contract-form-grid--three">
            <a-form-item class="contract-form-field--full" label="合同项目" name="project">
              <a-input
                v-model:value="form.project"
                placeholder="从合同名称带出，可按实际付款项目修正"
              />
            </a-form-item>
            <a-form-item label="合同开始日期" name="contractStartDate">
              <a-input v-model:value="form.contractStartDate" type="date" />
            </a-form-item>
            <a-form-item label="合同结束日期" name="contractEndDate">
              <a-input v-model:value="form.contractEndDate" type="date" />
            </a-form-item>
            <a-form-item label="合同签订日期" name="contractSigningDate">
              <a-input v-model:value="form.contractSigningDate" disabled type="date" />
            </a-form-item>
            <a-form-item label="合同金额" name="contractAmountCents">
              <MoneyInput v-model="form.contractAmountCents" aria-label="合同金额" disabled />
            </a-form-item>
            <a-form-item
              class="contract-form-field--full"
              label="乙方单位（全称）"
              name="counterpartyFullName"
            >
              <a-input v-model:value="form.counterpartyFullName" disabled />
            </a-form-item>
          </div>
        </FormSection>

        <FormSection title="预算与执行">
          <div class="contract-form-grid contract-form-grid--three">
            <a-form-item label="预算金额" name="budgetAmountCents">
              <MoneyInput v-model="form.budgetAmountCents" aria-label="预算金额" />
            </a-form-item>
            <a-form-item label="预算累计执行金额" name="budgetExecutedCents">
              <MoneyInput v-model="form.budgetExecutedCents" aria-label="预算累计执行金额" />
            </a-form-item>
            <a-form-item label="会计科目" name="accountingSubject">
              <a-input v-model:value="form.accountingSubject" placeholder="请输入会计科目" />
            </a-form-item>
            <a-form-item label="预计后续保养等费用" name="maintenanceEstimateCents">
              <MoneyInput v-model="form.maintenanceEstimateCents" aria-label="预计后续保养费用" />
            </a-form-item>
            <a-form-item label="合同约定付款次数" name="plannedPaymentCount">
              <a-input-number
                v-model:value="form.plannedPaymentCount"
                :min="1"
                :precision="0"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item label="本次为第几次付款" name="paymentSequence">
              <a-input-number
                v-model:value="form.paymentSequence"
                :min="1"
                :precision="0"
                style="width: 100%"
              />
            </a-form-item>
            <a-form-item label="累计已执行合同金额" name="executedAmountCents">
              <MoneyInput v-model="form.executedAmountCents" aria-label="累计已执行合同金额" />
            </a-form-item>
          </div>
          <div class="contract-calculation-strip">
            <div>
              <span>付款前合同余额</span><strong>{{ formatMoney(contractBalanceCents) }}</strong>
            </div>
            <div>
              <span>本次后合同余额</span
              ><strong>{{ formatMoney(remainingAfterPaymentCents) }}</strong>
            </div>
            <div>
              <span>本次后预算余额</span><strong>{{ formatMoney(budgetRemainingCents) }}</strong>
            </div>
          </div>
        </FormSection>

        <FormSection title="付款信息">
          <div class="contract-form-grid contract-form-grid--three">
            <a-form-item label="合同约定进度" name="plannedProgress">
              <a-input v-model:value="form.plannedProgress" addon-after="%" placeholder="0 - 100" />
            </a-form-item>
            <a-form-item label="实际进度" name="actualProgress">
              <a-input v-model:value="form.actualProgress" addon-after="%" placeholder="0 - 100" />
            </a-form-item>
            <a-form-item label="实际与合同进度差">
              <div class="contract-readonly-value">{{ progressVariance }}</div>
            </a-form-item>
            <a-form-item class="contract-form-field--full" label="付款方式" name="paymentMethod">
              <a-radio-group
                v-model:value="form.paymentMethod"
                @change="handlePaymentMethodChange($event.target.value)"
              >
                <a-radio
                  v-for="option in PAYMENT_METHOD_OPTIONS"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </a-radio>
              </a-radio-group>
            </a-form-item>
            <a-form-item label="票据号码" name="invoiceNumber">
              <a-input
                v-model:value="form.invoiceNumber"
                :disabled="!requiresInstrumentNumber"
                placeholder="支票或承兑汇票号码"
              />
            </a-form-item>
            <a-form-item label="工程合同保修期开始" name="warrantyStartDate">
              <a-input v-model:value="form.warrantyStartDate" type="date" />
            </a-form-item>
            <a-form-item label="工程合同保修期结束" name="warrantyEndDate">
              <a-input v-model:value="form.warrantyEndDate" type="date" />
            </a-form-item>
            <a-form-item label="此次付款金额（小写）" name="paymentAmountCents">
              <MoneyInput v-model="form.paymentAmountCents" aria-label="此次付款金额" :min="0.01" />
            </a-form-item>
            <a-form-item label="此次付款金额（大写）">
              <div class="contract-readonly-value">
                {{ paymentAmountUppercase || '保存草稿后由系统生成' }}
              </div>
            </a-form-item>
            <a-form-item
              class="contract-form-field--full"
              label="此次付款原因"
              name="paymentReason"
            >
              <a-textarea
                v-model:value="form.paymentReason"
                :auto-size="{ minRows: 5, maxRows: 12 }"
                :maxlength="5000"
                placeholder="请说明付款依据、履约情况及本次付款必要性"
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
