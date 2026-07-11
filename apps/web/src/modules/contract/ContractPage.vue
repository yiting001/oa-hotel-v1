<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { apiRequest, type ApiEnvelope, requestId } from '../../shared/api';

interface ContractEntity {
  id: string;
  number: string;
  name: string;
  amountCents: number;
  counterpartyFullName: string;
}

const requestForm = reactive({
  title: '空调维保支出请示',
  requestedAt: '2026-07-11',
  amountCents: 500000,
  content: '申请签订年度空调维保合同。',
  attachments: [] as string[],
});
const contractForm = reactive({
  requestId: null as string | null,
  signingDepartmentId: 'dept-business',
  signingDate: '2026-07-11',
  name: '空调维保合同',
  amountCents: 500000,
  counterpartyFullName: '上海示例维保有限公司',
  contentReason: '年度维保服务',
  needsSeal: true,
  attachments: [] as string[],
});
const paymentForm = reactive({
  contractId: '',
  project: '空调维保首款',
  contractStartDate: '2026-07-11',
  contractEndDate: '2027-07-10',
  contractSigningDate: '2026-07-11',
  contractAmountCents: 500000,
  budgetAmountCents: 500000,
  budgetExecutedCents: 0,
  accountingSubject: '维修费',
  maintenanceEstimateCents: 0,
  counterpartyFullName: '上海示例维保有限公司',
  plannedPaymentCount: 2,
  paymentSequence: 1,
  executedAmountCents: 0,
  plannedProgress: '50%',
  actualProgress: '50%',
  paymentMethod: 'CHEQUE',
  paymentReason: '首付款',
  invoiceNumber: 'FP001',
  warrantyStartDate: '2026-07-11',
  warrantyEndDate: '2027-07-10',
  paymentAmountCents: 200000,
  attachments: [] as string[],
});
const message = ref('未提交');
const createdContract = ref<ContractEntity | null>(null);

async function createRequest(): Promise<void> {
  const result = await apiRequest<ApiEnvelope<{ id: string }>>('/contracts/requests', {
    method: 'POST',
    body: requestForm,
  });
  contractForm.requestId = result.data.id;
  await apiRequest(`/workflow/documents/${result.data.id}/submit`, {
    method: 'POST',
    body: { requestId: requestId() },
  });
  message.value = `请示已提交：${result.data.id}`;
}

async function createContract(): Promise<void> {
  const result = await apiRequest<ApiEnvelope<ContractEntity>>('/contracts', {
    method: 'POST',
    body: contractForm,
  });
  createdContract.value = result.data;
  paymentForm.contractId = result.data.id;
  await apiRequest(`/workflow/documents/${result.data.id}/submit`, {
    method: 'POST',
    body: { requestId: requestId() },
  });
  message.value = `合同已提交：${result.data.number}`;
}

async function createPayment(): Promise<void> {
  const result = await apiRequest<ApiEnvelope<{ paymentAmountUppercase: string }>>(
    '/contracts/payments',
    { method: 'POST', body: paymentForm },
  );
  message.value = `付款草稿已保存，金额大写：${result.data.paymentAmountUppercase}`;
}

const amountLabel = computed(() => `${(paymentForm.paymentAmountCents / 100).toFixed(2)} 元`);
</script>

<template>
  <div class="page-card">
    <a-page-header title="合同支出" sub-title="请示、合同审批、付款申请纵向切片" />
    <a-alert type="success" show-icon :message="message" style="margin-bottom: 16px" />
    <div class="responsive-grid">
      <a-card title="合同/支出请示">
        <a-form layout="vertical">
          <a-form-item label="标题"><a-input v-model:value="requestForm.title" /></a-form-item>
          <a-form-item label="申请日期"
            ><a-input v-model:value="requestForm.requestedAt"
          /></a-form-item>
          <a-form-item label="金额（分）">
            <a-input-number v-model:value="requestForm.amountCents" style="width: 100%" />
          </a-form-item>
          <a-form-item label="请示内容">
            <a-textarea v-model:value="requestForm.content" />
          </a-form-item>
          <a-button type="primary" @click="createRequest">保存并提交请示</a-button>
        </a-form>
      </a-card>
      <a-card title="合同审批">
        <a-form layout="vertical">
          <a-form-item label="合同名称"><a-input v-model:value="contractForm.name" /></a-form-item>
          <a-form-item label="乙方单位全称">
            <a-input v-model:value="contractForm.counterpartyFullName" />
          </a-form-item>
          <a-form-item label="合同金额（分）">
            <a-input-number v-model:value="contractForm.amountCents" style="width: 100%" />
          </a-form-item>
          <a-form-item label="是否需要用印">
            <a-switch v-model:checked="contractForm.needsSeal" />
          </a-form-item>
          <a-button type="primary" @click="createContract">保存并提交合同</a-button>
        </a-form>
      </a-card>
      <a-card class="full" title="合同付款申请">
        <div class="responsive-grid">
          <a-form-item label="付款项目"
            ><a-input v-model:value="paymentForm.project"
          /></a-form-item>
          <a-form-item label="会计科目"
            ><a-input v-model:value="paymentForm.accountingSubject"
          /></a-form-item>
          <a-form-item label="合同约定次数">
            <a-input-number v-model:value="paymentForm.plannedPaymentCount" style="width: 100%" />
          </a-form-item>
          <a-form-item label="本次付款次数">
            <a-input-number v-model:value="paymentForm.paymentSequence" style="width: 100%" />
          </a-form-item>
          <a-form-item :label="`本次付款金额：${amountLabel}`">
            <a-input-number v-model:value="paymentForm.paymentAmountCents" style="width: 100%" />
          </a-form-item>
          <a-form-item label="付款原因"
            ><a-input v-model:value="paymentForm.paymentReason"
          /></a-form-item>
        </div>
        <div class="bottom-actions">
          <a-button type="primary" :disabled="!createdContract" @click="createPayment">
            保存付款申请
          </a-button>
        </div>
      </a-card>
    </div>
  </div>
</template>
