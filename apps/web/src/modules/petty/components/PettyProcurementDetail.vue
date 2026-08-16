<script setup lang="ts">
import { DeleteOutlined, EditOutlined } from '@ant-design/icons-vue';
import { message, Modal } from 'ant-design-vue';
import { ref } from 'vue';
import { apiRequest } from '../../../shared/api';
import { PETTY_API } from '../petty.config';
import { formatYuan } from '../petty.format';
import type { PettyItem, PettyProcurementData } from '../petty.types';

const props = defineProps<{ data: PettyProcurementData }>();
const emit = defineEmits<{ changed: [] }>();

const busy = ref(false);
const quantityEditorOpen = ref(false);
const editingItem = ref<PettyItem | null>(null);
const quantityDraft = ref(1);

const itemColumns = [
  { title: '物资名称', dataIndex: 'name' },
  { title: '品牌', dataIndex: 'brand' },
  { title: '单价', key: 'unitPrice' },
  { title: '数量', key: 'quantity' },
  { title: '小计', key: 'subtotal' },
  ...(props.data.canModerate ? [{ title: '审批操作', key: 'actions' }] : []),
];

function openQuantityEditor(item: PettyItem): void {
  editingItem.value = item;
  quantityDraft.value = item.quantity;
  quantityEditorOpen.value = true;
}

async function saveQuantity(): Promise<void> {
  const item = editingItem.value;
  if (!item) return;
  if (quantityDraft.value === item.quantity) {
    quantityEditorOpen.value = false;
    return;
  }
  busy.value = true;
  try {
    await apiRequest(PETTY_API.procurementItem(props.data.id, item.id), {
      method: 'PATCH',
      body: { quantity: quantityDraft.value },
    });
    message.success('数量已调整，变更已记录');
    quantityEditorOpen.value = false;
    emit('changed');
  } catch (error) {
    message.error(error instanceof Error ? error.message : '数量调整失败');
  } finally {
    busy.value = false;
  }
}

function removeItem(item: PettyItem): void {
  Modal.confirm({
    title: `删除明细「${item.name}（${item.brand}）」？`,
    content: '删除后系统会自动记录变更日志，发起人与后续审批人均可见。',
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      try {
        await apiRequest(PETTY_API.procurementItem(props.data.id, item.id), {
          method: 'DELETE',
        });
        message.success('明细已删除，变更已记录');
        emit('changed');
      } catch (error) {
        message.error(error instanceof Error ? error.message : '明细删除失败');
      }
    },
  });
}
</script>

<template>
  <div class="petty-detail">
    <a-alert
      v-if="data.canModerate"
      message="您是当前审批节点办理人，可直接调整数量或删除明细，操作将自动留痕。"
      show-icon
      style="margin-bottom: 12px"
      type="warning"
    />

    <a-table
      :columns="itemColumns"
      :data-source="data.items"
      :pagination="false"
      row-key="id"
      size="middle"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'unitPrice'">
          {{ formatYuan((record as PettyItem).unitPriceCents) }}
        </template>
        <template v-else-if="column.key === 'quantity'">
          {{ (record as PettyItem).quantity }}{{ (record as PettyItem).unit }}
        </template>
        <template v-else-if="column.key === 'subtotal'">
          {{ formatYuan((record as PettyItem).subtotalCents) }}
        </template>
        <template v-else-if="column.key === 'actions'">
          <a-space>
            <a-button size="small" type="link" @click="openQuantityEditor(record as PettyItem)">
              <template #icon><EditOutlined /></template>
              改数量
            </a-button>
            <a-button
              :disabled="data.items.length <= 1"
              danger
              size="small"
              type="link"
              @click="removeItem(record as PettyItem)"
            >
              <template #icon><DeleteOutlined /></template>
              删除
            </a-button>
          </a-space>
        </template>
      </template>
    </a-table>

    <div class="petty-detail__total">合计金额：{{ formatYuan(data.totalAmountCents) }}</div>

    <a-descriptions :column="1" style="margin-top: 16px" title="申请信息">
      <a-descriptions-item label="申请备注">{{ data.remark || '-' }}</a-descriptions-item>
      <a-descriptions-item label="附件">
        {{ data.attachments.length > 0 ? data.attachments.join('、') : '-' }}
      </a-descriptions-item>
    </a-descriptions>

    <template v-if="data.changeLogs.length > 0">
      <h4 style="margin-top: 16px">明细变更记录</h4>
      <a-timeline style="margin-top: 12px">
        <a-timeline-item v-for="log in data.changeLogs" :key="log.id">
          <div>{{ log.detail }}</div>
          <div class="petty-detail__log-meta">
            {{ log.actorName }} · {{ new Date(log.createdAt).toLocaleString() }}
          </div>
        </a-timeline-item>
      </a-timeline>
    </template>

    <a-modal
      v-model:open="quantityEditorOpen"
      :confirm-loading="busy"
      title="调整采购数量"
      @ok="saveQuantity"
    >
      <a-form layout="vertical">
        <a-form-item :label="`「${editingItem?.name}（${editingItem?.brand}）」数量`">
          <a-input-number v-model:value="quantityDraft" :min="1" :precision="0" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.petty-detail__total {
  margin-top: 12px;
  text-align: right;
  font-weight: 600;
  font-size: 16px;
}

.petty-detail__log-meta {
  color: var(--color-text-secondary);
  font-size: 12px;
}
</style>
