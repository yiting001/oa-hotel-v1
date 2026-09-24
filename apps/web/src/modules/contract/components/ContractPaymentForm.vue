<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus';
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
import { useLayoutMode } from '../../../ui/useLayoutMode';
import ContractDocumentActions from './ContractDocumentActions.vue';

const props = defineProps<{ mode: EditorMode; documentId?: string }>();
const { isCompact } = useLayoutMode();
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

// 校验规则由领域层提供（FormItemRule），跨字段校验读取同一份 reactive 草稿
const rules = computed<FormRules>(() => createContractPaymentRules(form));

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

function handlePaymentMethodChange(value: string | number | boolean | undefined): void {
  if (!PAYMENT_METHODS_REQUIRING_INSTRUMENT_NUMBER.includes(value as PaymentMethod)) {
    form.invoiceNumber = null;
  }
  void formRef.value?.validateField('invoiceNumber').catch(() => undefined);
}

onMounted(() => {
  void editor.initialize([session.ensureSession(), directory.load(), loadApprovedContracts()]);
});
</script>

<template>
  <div class="payment-form ui-page" :data-compact="isCompact">
    <DocumentFormLayout
      :description="props.mode === 'create' ? '已审批合同的履约付款申请' : '编辑合同付款申请'"
      :document-number="editor.documentNumber.value"
      :loading="editor.loading.value"
      :revision="editor.revision.value"
      :status="editor.status.value"
      eyebrow="合同管理"
      :title="props.mode === 'create' ? '新建合同/协议支出申请' : '合同/协议支出申请'"
    >
      <el-alert
        v-if="!editor.editable.value"
        :closable="false"
        show-icon
        title="当前单据已进入流程，不可继续编辑。"
        type="info"
      />

      <el-form
        ref="formRef"
        :disabled="!editor.editable.value"
        :model="form"
        :rules="rules"
        label-position="top"
      >
        <FormSection title="申请信息" description="合同快照与预算数据用于校验本次付款额度。">
          <div class="ui-fields">
            <el-form-item label="申请编号">
              <div class="readonly-value">{{ editor.documentNumber.value ?? '保存后自动生成' }}</div>
            </el-form-item>
            <el-form-item label="申请部门">
              <div class="readonly-value">{{ departmentName }}</div>
            </el-form-item>
            <el-form-item label="申请人">
              <div class="readonly-value">{{ session.user?.displayName ?? '-' }}</div>
            </el-form-item>
            <el-form-item label="已审批合同" prop="contractId">
              <el-select
                :model-value="form.contractId"
                filterable
                placeholder="请选择已审批合同"
                @update:model-value="
                  (value: string) => {
                    form.contractId = value;
                    applyContractSnapshot(value);
                  }
                "
              >
                <el-option
                  v-for="option in contractOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
          </div>
        </FormSection>

        <FormSection title="合同快照">
          <el-alert
            :closable="false"
            show-icon
            title="合同审批记录尚未存储履约起止日期，请根据合同正文补录并核对。"
            type="warning"
          />
          <div class="ui-fields payment-grid payment-grid--three">
            <el-form-item class="ui-field-full" label="合同项目" prop="project">
              <el-input v-model="form.project" placeholder="从合同名称带出，可按实际付款项目修正" />
            </el-form-item>
            <el-form-item label="合同开始日期" prop="contractStartDate">
              <el-date-picker
                v-model="form.contractStartDate"
                format="YYYY/MM/DD"
                style="width: 100%"
                type="date"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
            <el-form-item label="合同结束日期" prop="contractEndDate">
              <el-date-picker
                v-model="form.contractEndDate"
                format="YYYY/MM/DD"
                style="width: 100%"
                type="date"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
            <el-form-item label="合同签订日期" prop="contractSigningDate">
              <el-date-picker
                v-model="form.contractSigningDate"
                disabled
                format="YYYY/MM/DD"
                style="width: 100%"
                type="date"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
            <el-form-item label="合同金额" prop="contractAmountCents">
              <MoneyInput v-model="form.contractAmountCents" aria-label="合同金额" disabled />
            </el-form-item>
            <el-form-item class="ui-field-full" label="乙方单位（全称）" prop="counterpartyFullName">
              <el-input v-model="form.counterpartyFullName" disabled />
            </el-form-item>
          </div>
        </FormSection>

        <FormSection title="预算与执行">
          <div class="ui-fields payment-grid payment-grid--three">
            <el-form-item label="预算金额" prop="budgetAmountCents">
              <MoneyInput v-model="form.budgetAmountCents" aria-label="预算金额" />
            </el-form-item>
            <el-form-item label="预算累计执行金额" prop="budgetExecutedCents">
              <MoneyInput v-model="form.budgetExecutedCents" aria-label="预算累计执行金额" />
            </el-form-item>
            <el-form-item label="会计科目" prop="accountingSubject">
              <el-input v-model="form.accountingSubject" placeholder="请输入会计科目" />
            </el-form-item>
            <el-form-item label="预计后续保养等费用" prop="maintenanceEstimateCents">
              <MoneyInput v-model="form.maintenanceEstimateCents" aria-label="预计后续保养费用" />
            </el-form-item>
            <el-form-item label="合同约定付款次数" prop="plannedPaymentCount">
              <el-input-number v-model="form.plannedPaymentCount" :controls="false" :min="1" :precision="0" style="width: 100%" />
            </el-form-item>
            <el-form-item label="本次为第几次付款" prop="paymentSequence">
              <el-input-number v-model="form.paymentSequence" :controls="false" :min="1" :precision="0" style="width: 100%" />
            </el-form-item>
            <el-form-item label="累计已执行合同金额" prop="executedAmountCents">
              <MoneyInput v-model="form.executedAmountCents" aria-label="累计已执行合同金额" />
            </el-form-item>
          </div>
          <dl class="calc-strip">
            <div><dt>付款前合同余额</dt><dd>{{ formatMoney(contractBalanceCents) }}</dd></div>
            <div><dt>本次后合同余额</dt><dd>{{ formatMoney(remainingAfterPaymentCents) }}</dd></div>
            <div><dt>本次后预算余额</dt><dd>{{ formatMoney(budgetRemainingCents) }}</dd></div>
          </dl>
        </FormSection>

        <FormSection title="付款信息">
          <div class="ui-fields payment-grid payment-grid--three">
            <el-form-item label="合同约定进度" prop="plannedProgress">
              <el-input v-model="form.plannedProgress" placeholder="0 - 100">
                <template #append>%</template>
              </el-input>
            </el-form-item>
            <el-form-item label="实际进度" prop="actualProgress">
              <el-input v-model="form.actualProgress" placeholder="0 - 100">
                <template #append>%</template>
              </el-input>
            </el-form-item>
            <el-form-item label="实际与合同进度差">
              <div class="readonly-value">{{ progressVariance }}</div>
            </el-form-item>
            <el-form-item class="ui-field-full" label="付款方式" prop="paymentMethod">
              <el-radio-group :model-value="form.paymentMethod" @update:model-value="handlePaymentMethodChange">
                <el-radio v-for="option in PAYMENT_METHOD_OPTIONS" :key="option.value" :value="option.value">
                  {{ option.label }}
                </el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="票据号码" prop="invoiceNumber">
              <el-input
                v-model="form.invoiceNumber"
                :disabled="!requiresInstrumentNumber"
                placeholder="支票或承兑汇票号码"
              />
            </el-form-item>
            <el-form-item label="工程合同保修期开始" prop="warrantyStartDate">
              <el-date-picker
                v-model="form.warrantyStartDate"
                format="YYYY/MM/DD"
                style="width: 100%"
                type="date"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
            <el-form-item label="工程合同保修期结束" prop="warrantyEndDate">
              <el-date-picker
                v-model="form.warrantyEndDate"
                format="YYYY/MM/DD"
                style="width: 100%"
                type="date"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
            <el-form-item label="此次付款金额（小写）" prop="paymentAmountCents">
              <MoneyInput v-model="form.paymentAmountCents" aria-label="此次付款金额" :min="0.01" />
            </el-form-item>
            <el-form-item label="此次付款金额（大写）">
              <div class="readonly-value">{{ paymentAmountUppercase || '保存草稿后由系统生成' }}</div>
            </el-form-item>
            <el-form-item class="ui-field-full" label="此次付款原因" prop="paymentReason">
              <el-input
                v-model="form.paymentReason"
                :autosize="{ minRows: 5, maxRows: 12 }"
                :maxlength="5000"
                placeholder="请说明付款依据、履约情况及本次付款必要性"
                show-word-limit
                type="textarea"
              />
            </el-form-item>
          </div>
        </FormSection>

        <FormSection title="附件材料">
          <el-form-item prop="attachments">
            <AttachmentField v-model="form.attachments" />
          </el-form-item>
        </FormSection>
      </el-form>

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

<style scoped>
.readonly-value {
  display: flex;
  min-height: var(--control-h);
  align-items: center;
  padding: 0 12px;
  color: var(--color-text-secondary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow-wrap: anywhere;
}
.payment-grid { margin-top: 16px; }
.payment-grid--three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.calc-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin: 4px 0 0;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}
.calc-strip dt { color: var(--color-text-tertiary); font-size: 12px; }
.calc-strip dd { margin: 4px 0 0; font-size: 18px; font-weight: 600; font-variant-numeric: tabular-nums; }
.payment-form[data-compact='true'] .payment-grid--three { grid-template-columns: minmax(0, 1fr); }
.payment-form[data-compact='true'] .calc-strip { grid-template-columns: minmax(0, 1fr); }
</style>
