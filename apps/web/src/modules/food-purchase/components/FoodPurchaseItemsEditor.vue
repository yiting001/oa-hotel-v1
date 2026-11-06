<script setup lang="ts">
import { Delete, Plus } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import { computed, ref, watch } from 'vue';
import { apiRequest, type ApiEnvelope } from '../../../shared/api';
import MoneyInput from '../../../shared/components/MoneyInput.vue';
import { formatMoney } from '../../../shared/format';
import { FOOD_CATEGORIES, foodItemsForCategory } from '../food-catalog';
import { FOOD_PURCHASE_API } from '../food-purchase.config';
import type { FoodPurchaseItem, FoodPurchaseItemDraft } from '../food-purchase.types';
import PinyinAutocomplete from './PinyinAutocomplete.vue';

const props = defineProps<{ documentId: string; items: FoodPurchaseItem[] }>();
const emit = defineEmits<{ saved: [] }>();

const emptyItem = (): FoodPurchaseItemDraft => ({
  category: '',
  name: '',
  specification: '',
  unit: '',
  quantity: 1,
  requirement: '',
  unitPriceCents: null,
  remark: '',
});

const drafts = ref<FoodPurchaseItemDraft[]>([]);
const saving = ref(false);

watch(
  () => props.items,
  (items) => {
    drafts.value = items.map((item) => ({
      category: item.category ?? '',
      name: item.name,
      specification: item.specification,
      unit: item.unit,
      quantity: item.quantity,
      requirement: item.requirement ?? '',
      unitPriceCents: item.unitPriceCents,
      remark: item.remark,
    }));
  },
  { immediate: true },
);

const totalCents = computed(() =>
  drafts.value.reduce((sum, item) => sum + (item.unitPriceCents ?? 0) * item.quantity, 0),
);

function addItem(): void {
  drafts.value = [...drafts.value, emptyItem()];
}

function removeItem(index: number): void {
  drafts.value = drafts.value.filter((_, current) => current !== index);
}

function rowItems(item: FoodPurchaseItemDraft) {
  return foodItemsForCategory(item.category);
}

function rowSubtotal(item: FoodPurchaseItemDraft): string {
  return item.unitPriceCents === null
    ? '待填'
    : formatMoney(item.unitPriceCents * item.quantity);
}

async function saveItems(): Promise<void> {
  const rows = drafts.value.filter((item) => item.name.trim().length > 0);
  if (rows.length === 0) {
    ElMessage.warning('请至少保留一行采购明细');
    return;
  }
  if (rows.some((item) => !item.unit.trim() || item.quantity < 1)) {
    ElMessage.warning('采购明细需填写品名、数量和单位');
    return;
  }
  saving.value = true;
  try {
    await apiRequest<ApiEnvelope<unknown>>(FOOD_PURCHASE_API.items(props.documentId), {
      method: 'PUT',
      body: {
        items: rows.map((item) => ({
          category: item.category.trim(),
          name: item.name.trim(),
          specification: item.specification.trim(),
          unit: item.unit.trim(),
          quantity: item.quantity,
          requirement: item.requirement.trim(),
          unitPriceCents: item.unitPriceCents,
          remark: item.remark.trim(),
        })),
      },
    });
    ElMessage.success('采购明细已更新');
    emit('saved');
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '明细保存失败');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="food-editor">
    <p class="food-editor__hint">
      审批领导可删减、修改明细，补充单价；品类与品名支持拼音首字母检索（如 wr → 五花肉）。
    </p>
    <div class="food-editor__scroll">
      <div class="food-editor__grid">
        <div class="food-editor__row food-editor__row--head" aria-hidden="true">
          <span>品类</span>
          <span>品名</span>
          <span>规格</span>
          <span>数量</span>
          <span>单位</span>
          <span>要求</span>
          <span>单价</span>
          <span>总价</span>
          <span>备注</span>
          <span />
        </div>
        <div
          v-for="(item, index) in drafts"
          :key="index"
          class="food-editor__row"
          :data-testid="`food-approver-item-${index}`"
        >
          <PinyinAutocomplete
            v-model="item.category"
            :maxlength="50"
            :options="FOOD_CATEGORIES"
            placeholder="如：蔬菜类"
          />
          <PinyinAutocomplete
            v-model="item.name"
            :maxlength="200"
            :options="rowItems(item)"
            placeholder="如：五花肉"
          />
          <el-input v-model="item.specification" :maxlength="200" aria-label="规格" />
          <el-input-number
            v-model="item.quantity"
            :controls="false"
            :min="1"
            :precision="0"
            aria-label="数量"
          />
          <el-input v-model="item.unit" :maxlength="20" aria-label="单位" />
          <el-input v-model="item.requirement" :maxlength="200" aria-label="要求" />
          <MoneyInput v-model="item.unitPriceCents" aria-label="单价" />
          <span class="food-editor__subtotal">{{ rowSubtotal(item) }}</span>
          <el-input v-model="item.remark" :maxlength="300" aria-label="备注" />
          <el-button
            :aria-label="`删除第 ${index + 1} 行明细`"
            :icon="Delete"
            text
            type="danger"
            @click="removeItem(index)"
          />
        </div>
      </div>
    </div>
    <div class="food-editor__footer">
      <el-button :icon="Plus" text @click="addItem">添加明细行</el-button>
      <span>合计：<strong>{{ formatMoney(totalCents) }}</strong></span>
      <el-button :loading="saving" type="primary" @click="saveItems">保存明细调整</el-button>
    </div>
  </div>
</template>

<style scoped>
.food-editor { display: grid; gap: 10px; }
.food-editor__hint { margin: 0; color: var(--color-text-tertiary); font-size: 12px; line-height: 1.6; }
.food-editor__scroll { overflow-x: auto; padding-bottom: 4px; }
.food-editor__grid { display: grid; min-width: 1020px; gap: 10px; }
.food-editor__row {
  display: grid;
  grid-template-columns: minmax(90px, 0.8fr) minmax(120px, 1.1fr) minmax(90px, 0.9fr) 76px 68px minmax(110px, 1fr) 106px 86px minmax(100px, 1fr) 40px;
  align-items: center;
  gap: 8px;
}
.food-editor__row--head { color: var(--color-text-tertiary); font-size: 13px; }
.food-editor__subtotal { color: var(--color-text-secondary); font-variant-numeric: tabular-nums; }
.food-editor__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--color-text-secondary);
  font-size: 13px;
}
.food-editor__footer strong { color: var(--color-text); font-size: 16px; }
</style>
