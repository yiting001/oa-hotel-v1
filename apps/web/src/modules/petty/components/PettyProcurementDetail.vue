<script setup lang="ts">
import { Delete, Edit } from '@element-plus/icons-vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { computed, ref } from 'vue';
import { apiRequest } from '../../../shared/api';
import KeyValueSummary from '../../../shared/components/KeyValueSummary.vue';
import { formatDateTime } from '../../../shared/format';
import UiDataList, { type DataColumn } from '../../../ui/UiDataList.vue';
import UiDialog from '../../../ui/UiDialog.vue';
import { PETTY_API } from '../petty.config';
import { formatYuan } from '../petty.format';
import type { PettyItem, PettyProcurementData } from '../petty.types';

const props = defineProps<{ data: PettyProcurementData }>();
const emit = defineEmits<{ changed: [] }>();

const busy = ref(false);
const quantityEditorOpen = ref(false);
const editingItem = ref<PettyItem | null>(null);
const quantityDraft = ref(1);

const columns = computed<DataColumn[]>(() => [
  { key: 'name', label: '物资名称', minWidth: 170 },
  { key: 'brand', label: '品牌', minWidth: 130 },
  { key: 'unitPrice', label: '单价', width: 132, align: 'right' },
  { key: 'quantity', label: '数量', width: 120 },
  { key: 'subtotal', label: '小计', width: 132, align: 'right' },
  ...(props.data.canModerate ? [{ key: 'actions', label: '审批操作', width: 188 }] : []),
]);

const summaryItems = computed(() => [
  { label: '申请备注', value: props.data.remark || '-' },
  {
    label: '附件',
    value: props.data.attachments.length > 0 ? props.data.attachments.join('、') : '-',
  },
]);

function openQuantityEditor(item: PettyItem): void {
  editingItem.value = item;
  quantityDraft.value = item.quantity;
  quantityEditorOpen.value = true;
}

function setQuantityDraft(value: unknown): void {
  // 数量保持为不小于 1 的整数，与提交接口的约束一致。
  quantityDraft.value = typeof value === 'number' && Number.isFinite(value) ? Math.max(1, value) : 1;
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
    ElMessage.success('数量已调整，变更已记录');
    quantityEditorOpen.value = false;
    emit('changed');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '数量调整失败');
  } finally {
    busy.value = false;
  }
}

async function removeItem(item: PettyItem): Promise<void> {
  try {
    await ElMessageBox.confirm(
      '删除后系统会自动记录变更日志，发起人与后续审批人均可见。',
      `删除明细「${item.name}（${item.brand}）」？`,
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    );
  } catch {
    return;
  }
  try {
    await apiRequest(PETTY_API.procurementItem(props.data.id, item.id), { method: 'DELETE' });
    ElMessage.success('明细已删除，变更已记录');
    emit('changed');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '明细删除失败');
  }
}
</script>

<template>
  <div class="petty-detail">
    <el-alert
      v-if="data.canModerate"
      class="petty-detail__notice"
      title="您是当前审批节点办理人，可直接调整数量或删除明细，操作将自动留痕。"
      show-icon
      type="warning"
      :closable="false"
    />

    <section class="petty-detail__section ui-section">
      <h3>采买明细</h3>
      <UiDataList :columns="columns" :rows="data.items" empty-text="暂无物资明细" row-key="id">
        <template #cell-unitPrice="{ row }">{{ formatYuan(row.unitPriceCents) }}</template>
        <template #cell-quantity="{ row }">{{ row.quantity }}{{ row.unit }}</template>
        <template #cell-subtotal="{ row }">{{ formatYuan(row.subtotalCents) }}</template>
        <template #mobile-title="{ row }">
          <strong>{{ row.name }}</strong>
          <span class="ui-text-muted"> · {{ row.brand }}</span>
        </template>
        <template v-if="data.canModerate" #actions="{ row }">
          <el-button link type="primary" @click="openQuantityEditor(row)">
            <el-icon><Edit /></el-icon>
            改数量
          </el-button>
          <el-button
            :disabled="data.items.length <= 1"
            link
            type="danger"
            @click="removeItem(row)"
          >
            <el-icon><Delete /></el-icon>
            删除
          </el-button>
        </template>
      </UiDataList>
      <div class="petty-detail__total">合计金额：{{ formatYuan(data.totalAmountCents) }}</div>
    </section>

    <section class="petty-detail__section ui-section">
      <h3>申请信息</h3>
      <KeyValueSummary :columns="1" :items="summaryItems" />
    </section>

    <section v-if="data.changeLogs.length > 0" class="petty-detail__section ui-section">
      <h3>明细变更记录</h3>
      <ol class="petty-detail__logs">
        <li v-for="log in data.changeLogs" :key="log.id">
          <div>{{ log.detail }}</div>
          <div class="petty-detail__log-meta">
            {{ log.actorName }} · {{ formatDateTime(log.createdAt) }}
          </div>
        </li>
      </ol>
    </section>

    <UiDialog v-model="quantityEditorOpen" title="调整采购数量" :width="480">
      <el-form label-position="top">
        <el-form-item :label="`「${editingItem?.name}（${editingItem?.brand}）」数量`">
          <el-input-number
            :min="1"
            :model-value="quantityDraft"
            :precision="0"
            aria-label="调整后的采购数量"
            controls-position="right"
            @update:model-value="setQuantityDraft"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="quantityEditorOpen = false">取消</el-button>
        <el-button :loading="busy" type="primary" @click="saveQuantity">保存</el-button>
      </template>
    </UiDialog>
  </div>
</template>

<style scoped>
.petty-detail {
  min-width: 0;
}

.petty-detail__notice {
  margin-bottom: 20px;
}

.petty-detail__section {
  min-width: 0;
}

.petty-detail__section h3 {
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
}

.petty-detail__total {
  margin-top: 12px;
  text-align: right;
  font-size: 16px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.petty-detail__logs {
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.petty-detail__logs li {
  padding: 12px 0;
  border-bottom: 1px solid var(--color-border-soft);
}

.petty-detail__log-meta {
  margin-top: 4px;
  color: var(--color-text-secondary);
  font-size: 12px;
}
</style>
