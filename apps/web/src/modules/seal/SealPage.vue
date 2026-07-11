<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { apiRequest, type ApiEnvelope, requestId } from '../../shared/api';

interface SealAsset {
  id: string;
  name: string;
  status: string;
}

const assets = ref<SealAsset[]>([]);
const message = ref('未提交');
const borrowId = ref('');
const useId = ref('');
const borrowForm = reactive({
  useDate: '2026-07-12',
  plannedReturnDate: '2026-07-13',
  companionIds: ['user-office'],
  destination: '银行',
  sealAssetIds: ['seal-company'],
  content: '办理合同资料。',
  attachments: [] as string[],
});
const useForm = reactive({
  useDate: '2026-07-12',
  purpose: '合同盖章',
  sealAssetIds: ['seal-company'],
  content: '空调维保合同盖章两份。',
  attachments: [] as string[],
});

async function loadAssets(): Promise<void> {
  assets.value = await apiRequest<SealAsset[]>('/seals/assets');
}

async function createBorrow(): Promise<void> {
  const result = await apiRequest<ApiEnvelope<{ id: string }>>('/seals/borrow-requests', {
    method: 'POST',
    body: borrowForm,
  });
  borrowId.value = result.data.id;
  await apiRequest(`/workflow/documents/${result.data.id}/submit`, {
    method: 'POST',
    body: { requestId: requestId() },
  });
  message.value = `外借申请已提交：${result.data.id}`;
}

async function createUse(): Promise<void> {
  const result = await apiRequest<ApiEnvelope<{ id: string }>>('/seals/use-requests', {
    method: 'POST',
    body: useForm,
  });
  useId.value = result.data.id;
  await apiRequest(`/workflow/documents/${result.data.id}/submit`, {
    method: 'POST',
    body: { requestId: requestId() },
  });
  message.value = `用印申请已提交：${result.data.id}`;
}

async function checkout(): Promise<void> {
  await apiRequest(`/seals/borrow-requests/${borrowId.value}/checkout`, {
    method: 'POST',
    body: { actualRecipient: '业务申请人', checkedOutAt: new Date().toISOString() },
  });
  message.value = '外借领用已登记';
}

async function returnBorrow(): Promise<void> {
  await apiRequest(`/seals/borrow-requests/${borrowId.value}/return`, {
    method: 'POST',
    body: {
      returnedAt: new Date().toISOString(),
      returnCondition: '完好',
      exceptionNote: null,
    },
  });
  message.value = '外借归还已登记';
}

async function executeUse(): Promise<void> {
  await apiRequest(`/seals/use-requests/${useId.value}/execute`, {
    method: 'POST',
    body: {
      stampedCopies: 2,
      executedAt: new Date().toISOString(),
      archiveNumber: `ARCH-${Date.now()}`,
      executionNote: '文件已归档',
    },
  });
  message.value = '用印执行已登记';
}

onMounted(loadAssets);
</script>

<template>
  <div class="page-card">
    <a-page-header title="行政印章" sub-title="外借、用印和执行台账" />
    <a-alert type="success" show-icon :message="message" style="margin-bottom: 16px" />
    <a-list bordered :data-source="assets" style="margin-bottom: 16px">
      <template #renderItem="{ item }">
        <a-list-item>{{ item.name }} / {{ item.status }}</a-list-item>
      </template>
    </a-list>
    <div class="responsive-grid">
      <a-card title="印章证照外借申请">
        <a-form layout="vertical">
          <a-form-item label="使用日期"><a-input v-model:value="borrowForm.useDate" /></a-form-item>
          <a-form-item label="归还日期">
            <a-input v-model:value="borrowForm.plannedReturnDate" />
          </a-form-item>
          <a-form-item label="前往地点"
            ><a-input v-model:value="borrowForm.destination"
          /></a-form-item>
          <a-form-item label="申请内容"
            ><a-textarea v-model:value="borrowForm.content"
          /></a-form-item>
          <a-space wrap>
            <a-button type="primary" @click="createBorrow">提交外借</a-button>
            <a-button :disabled="!borrowId" @click="checkout">登记领用</a-button>
            <a-button :disabled="!borrowId" @click="returnBorrow">登记归还</a-button>
          </a-space>
        </a-form>
      </a-card>
      <a-card title="印章证照使用申请">
        <a-form layout="vertical">
          <a-form-item label="使用日期"><a-input v-model:value="useForm.useDate" /></a-form-item>
          <a-form-item label="用途"><a-input v-model:value="useForm.purpose" /></a-form-item>
          <a-form-item label="申请内容"><a-textarea v-model:value="useForm.content" /></a-form-item>
          <a-space wrap>
            <a-button type="primary" @click="createUse">提交用印</a-button>
            <a-button :disabled="!useId" @click="executeUse">登记用印执行</a-button>
          </a-space>
        </a-form>
      </a-card>
    </div>
  </div>
</template>
