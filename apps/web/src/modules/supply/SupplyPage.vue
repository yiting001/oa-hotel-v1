<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { apiRequest, type ApiEnvelope, requestId } from '../../shared/api';

interface MaterialItem {
  id: string;
  code: string;
  name: string;
  specification: string;
  unit: string;
  availableQuantity: string;
}

const items = ref<MaterialItem[]>([]);
const message = ref('未提交');
const requisitionId = ref('');
const purchaseForm = reactive({
  applicationDate: '2026-07-11',
  items: [
    {
      name: 'A4 复印纸',
      brand: null as string | null,
      specification: '80g',
      unit: '包',
      requestedQuantity: '10',
      monthlyConsumption: '3',
      referenceUnitPriceCents: 2500,
      remark: null as string | null,
    },
  ],
});
const requisitionForm = reactive({
  applicationDate: '2026-07-11',
  contactUserId: 'user-applicant',
  items: [{ materialItemId: 'item-paper', requestedQuantity: '5', purpose: '部门办公' }],
  attachments: [] as string[],
});

async function loadItems(): Promise<void> {
  items.value = await apiRequest<MaterialItem[]>('/supplies/items');
}

async function createPurchase(): Promise<void> {
  const result = await apiRequest<ApiEnvelope<{ id: string; taxableAmountTotalCents: number }>>(
    '/supplies/purchase-requests',
    { method: 'POST', body: purchaseForm },
  );
  await apiRequest(`/workflow/documents/${result.data.id}/submit`, {
    method: 'POST',
    body: { requestId: requestId() },
  });
  message.value = `申购已提交，含税金额合计 ${(result.data.taxableAmountTotalCents / 100).toFixed(2)} 元`;
}

async function createRequisition(): Promise<void> {
  const result = await apiRequest<ApiEnvelope<{ id: string }>>('/supplies/requisitions', {
    method: 'POST',
    body: requisitionForm,
  });
  requisitionId.value = result.data.id;
  await apiRequest(`/workflow/documents/${result.data.id}/submit`, {
    method: 'POST',
    body: { requestId: requestId() },
  });
  message.value = `领用已提交：${result.data.id}`;
}

async function issue(): Promise<void> {
  const result = await apiRequest<ApiEnvelope<{ issueStatus: string }>>(
    `/supplies/requisitions/${requisitionId.value}/issue`,
    {
      method: 'POST',
      body: {
        issuedAt: new Date().toISOString(),
        items: [{ materialItemId: 'item-paper', issuedQuantity: '3' }],
      },
    },
  );
  await loadItems();
  message.value = `发放已登记：${result.data.issueStatus}`;
}

onMounted(loadItems);
</script>

<template>
  <div class="page-card">
    <a-page-header title="物资申购领用" sub-title="申购、库存和实发台账" />
    <a-alert type="success" show-icon :message="message" style="margin-bottom: 16px" />
    <a-table
      :data-source="items"
      :pagination="false"
      row-key="id"
      size="small"
      style="margin-bottom: 16px"
    >
      <a-table-column title="货物编号" data-index="code" />
      <a-table-column title="品名" data-index="name" />
      <a-table-column title="规格" data-index="specification" />
      <a-table-column title="单位" data-index="unit" />
      <a-table-column title="可用库存" data-index="availableQuantity" />
    </a-table>
    <div class="responsive-grid">
      <a-card title="物资申购">
        <a-form layout="vertical">
          <a-form-item label="品名">
            <a-input v-model:value="purchaseForm.items[0].name" />
          </a-form-item>
          <a-form-item label="申购数量">
            <a-input v-model:value="purchaseForm.items[0].requestedQuantity" />
          </a-form-item>
          <a-form-item label="月消耗数量">
            <a-input v-model:value="purchaseForm.items[0].monthlyConsumption" />
          </a-form-item>
          <a-form-item label="参考单价（分）">
            <a-input-number
              v-model:value="purchaseForm.items[0].referenceUnitPriceCents"
              style="width: 100%"
            />
          </a-form-item>
          <a-button type="primary" @click="createPurchase">提交申购</a-button>
        </a-form>
      </a-card>
      <a-card title="物品领用">
        <a-form layout="vertical">
          <a-form-item label="请领数量">
            <a-input v-model:value="requisitionForm.items[0].requestedQuantity" />
          </a-form-item>
          <a-form-item label="用途">
            <a-input v-model:value="requisitionForm.items[0].purpose" />
          </a-form-item>
          <a-space wrap>
            <a-button type="primary" @click="createRequisition">提交领用</a-button>
            <a-button :disabled="!requisitionId" @click="issue">登记实发 3 包</a-button>
          </a-space>
        </a-form>
      </a-card>
    </div>
  </div>
</template>
