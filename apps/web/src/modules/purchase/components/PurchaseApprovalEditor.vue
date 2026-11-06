<script setup lang="ts">
import type { DocumentAttachmentItem } from '@oa/contracts';
import { ElMessage } from 'element-plus';
import { computed, ref, watch } from 'vue';
import { apiRequest } from '../../../shared/api';
import AttachmentUploadField from '../../../shared/components/AttachmentUploadField.vue';
import MoneyInput from '../../../shared/components/MoneyInput.vue';
import { formatMoney } from '../../../shared/format';
import { PURCHASE_API } from '../purchase.config';
import type { PurchaseItem } from '../purchase.types';

const props = defineProps<{
  documentId: string;
  items: PurchaseItem[];
  attachments: DocumentAttachmentItem[];
}>();
const emit = defineEmits<{ saved: [] }>();

const prices = ref<Record<string, number | null>>({});
const attachmentList = ref<DocumentAttachmentItem[]>([]);
const saving = ref(false);

watch(
  () => props.items,
  (items) => {
    prices.value = Object.fromEntries(items.map((item) => [item.id, item.unitPriceCents]));
  },
  { immediate: true },
);
watch(
  () => props.attachments,
  (value) => {
    attachmentList.value = [...value];
  },
  { immediate: true },
);

const totalCents = computed(() =>
  props.items.reduce((sum, item) => sum + (prices.value[item.id] ?? 0) * item.quantity, 0),
);

function priceOf(item: PurchaseItem): number | null {
  return prices.value[item.id] ?? null;
}

function setPrice(item: PurchaseItem, value: number | null): void {
  prices.value = { ...prices.value, [item.id]: value };
}

async function save(): Promise<void> {
  if (props.items.length === 0) {
    ElMessage.warning('没有可补充的采购明细');
    return;
  }
  saving.value = true;
  try {
    await apiRequest<unknown>(PURCHASE_API.approval(props.documentId), {
      method: 'PUT',
      body: {
        items: props.items.map((item) => ({
          name: item.name,
          specification: item.specification ?? '',
          unit: item.unit,
          quantity: item.quantity,
          unitPriceCents: prices.value[item.id] ?? 0,
        })),
        attachments: attachmentList.value,
      },
    });
    ElMessage.success('单价与附件已保存');
    emit('saved');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '保存失败，请稍后重试');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="purchase-approval-editor">
    <p class="purchase-approval-editor__hint">
      采购经办可补充单价和附件；保存后再点“同意”继续流转。
    </p>
    <el-table :data="items" size="small" border>
      <el-table-column prop="name" label="品名" min-width="140" />
      <el-table-column prop="specification" label="规格" min-width="100" />
      <el-table-column prop="quantity" label="数量" width="70" />
      <el-table-column prop="unit" label="单位" width="70" />
      <el-table-column label="单价" width="150">
        <template #default="{ row }">
          <MoneyInput
            :model-value="priceOf(row)"
            :aria-label="`${row.name}单价`"
            @update:model-value="setPrice(row, $event)"
          />
        </template>
      </el-table-column>
      <el-table-column label="总价" width="120">
        <template #default="{ row }">{{
          formatMoney((prices[row.id] ?? 0) * row.quantity)
        }}</template>
      </el-table-column>
    </el-table>
    <div class="purchase-approval-editor__total">合计：{{ formatMoney(totalCents) }}</div>
    <h4>附件</h4>
    <AttachmentUploadField
      v-model="attachmentList"
      :upload-path="PURCHASE_API.approvalAttachments(documentId)"
    />
    <div class="purchase-approval-editor__actions">
      <el-button type="primary" :loading="saving" @click="save">保存单价与附件</el-button>
    </div>
  </div>
</template>

<style scoped>
.purchase-approval-editor {
  margin-top: 16px;
  padding: 14px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: 8px;
  background: var(--color-surface, #f7f8fa);
}
.purchase-approval-editor__hint {
  margin: 0 0 12px;
  color: var(--color-text-secondary, #45515e);
  font-size: 13px;
}
.purchase-approval-editor__total {
  margin: 12px 0;
  text-align: right;
  font-weight: 600;
}
.purchase-approval-editor h4 {
  margin: 16px 0 8px;
  font-size: 14px;
  font-weight: 600;
}
.purchase-approval-editor__actions {
  margin-top: 12px;
  text-align: right;
}
</style>
