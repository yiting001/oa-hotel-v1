<script setup lang="ts">
import { Delete, Plus } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import AttachmentUploadField from '../../../shared/components/AttachmentUploadField.vue';
import DocumentFormLayout from '../../../shared/components/DocumentFormLayout.vue';
import FormSection from '../../../shared/components/FormSection.vue';
import MoneyInput from '../../../shared/components/MoneyInput.vue';
import WorkflowSidebar from '../../../shared/components/WorkflowSidebar.vue';
import { formatMoney, todayIso } from '../../../shared/format';
import { useSessionStore } from '../../../shared/session';
import { useWorkflowStore } from '../../../shared/workflow';
import { useLayoutMode } from '../../../ui/useLayoutMode';
import ContractDocumentActions from '../../contract/components/ContractDocumentActions.vue';
import type { EditorMode } from '../../contract/contract.types';
import {
  useContractDocumentEditor,
  validateDocumentForm,
} from '../../contract/useContractDocumentEditor';
import { FOOD_CATEGORIES, foodItemsForCategory } from '../food-catalog';
import { FOOD_PURCHASE_API, FOOD_PURCHASE_ROUTE_NAMES } from '../food-purchase.config';
import type {
  FoodPurchaseData,
  FoodPurchaseItemDraft,
  FoodPurchasePayload,
} from '../food-purchase.types';
import PinyinAutocomplete from './PinyinAutocomplete.vue';

const props = defineProps<{ mode: EditorMode; documentId?: string }>();
const formRef = ref<FormInstance>();
const session = useSessionStore();
const workflow = useWorkflowStore();
const { isCompact } = useLayoutMode();

const form = reactive<FoodPurchasePayload>({
  applicationDate: todayIso(),
  teamName: '',
  items: [],
  attachments: [],
});

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

const itemDrafts = ref<FoodPurchaseItemDraft[]>([emptyItem()]);

const totalCents = computed(() =>
  itemDrafts.value.reduce(
    (sum, item) => sum + (item.unitPriceCents ?? 0) * item.quantity,
    0,
  ),
);

/** 发起时只要求品名、数量和单位，单价可留空由审批领导补充。 */
function validateItemRows(): void {
  const rows = itemDrafts.value.filter(
    (item) => item.name.trim().length > 0 || item.unit.trim().length > 0,
  );
  if (rows.length === 0) {
    throw new Error('请至少填写一行采购明细（品名、数量、单位）');
  }
  const incomplete = rows.find(
    (item) => !item.name.trim() || !item.unit.trim() || item.quantity < 1,
  );
  if (incomplete) {
    throw new Error('采购明细需填写品名、数量和单位');
  }
}

function addItem(): void {
  itemDrafts.value = [...itemDrafts.value, emptyItem()];
}

function removeItem(index: number): void {
  itemDrafts.value = itemDrafts.value.filter((_, current) => current !== index);
}

function rowItems(item: FoodPurchaseItemDraft) {
  return foodItemsForCategory(item.category);
}

function rowSubtotal(item: FoodPurchaseItemDraft): string {
  return item.unitPriceCents === null
    ? '待填'
    : formatMoney(item.unitPriceCents * item.quantity);
}

const rules: FormRules<FoodPurchasePayload> = {
  applicationDate: [{ required: true, message: '请选择申请日期' }],
};

const editor = useContractDocumentEditor<FoodPurchaseData, FoodPurchasePayload>({
  mode: props.mode,
  documentId: props.documentId,
  documentType: 'FOOD_PURCHASE',
  createPath: FOOD_PURCHASE_API.purchases,
  itemPath: FOOD_PURCHASE_API.purchase,
  editRouteName: FOOD_PURCHASE_ROUTE_NAMES.edit,
  listRouteName: FOOD_PURCHASE_ROUTE_NAMES.list,
  validate: async () => {
    await validateDocumentForm(formRef.value);
    validateItemRows();
  },
  payload: () => ({
    applicationDate: form.applicationDate,
    teamName: form.teamName.trim(),
    items: itemDrafts.value
      .filter((item) => item.name.trim().length > 0)
      .map((item) => ({
        category: item.category.trim(),
        name: item.name.trim(),
        specification: item.specification.trim(),
        unit: item.unit.trim(),
        quantity: item.quantity,
        requirement: item.requirement.trim(),
        unitPriceCents: item.unitPriceCents,
        remark: item.remark.trim(),
      })),
    attachments: [...form.attachments],
  }),
  assign: (data) => {
    form.applicationDate = data.applicationDate || todayIso();
    form.teamName = data.teamName ?? '';
    form.attachments = [...data.attachments];
    itemDrafts.value = (data.items ?? []).map((item) => ({
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
});

onMounted(() => {
  void editor.initialize([session.ensureSession(), workflow.refresh()]);
});
</script>

<template>
  <div class="contract-document-form">
    <DocumentFormLayout
      :description="
        props.mode === 'create' ? '按品类登记食材采购明细' : '编辑食材采购单'
      "
      :document-number="editor.documentNumber.value"
      :loading="editor.loading.value"
      :revision="editor.revision.value"
      :status="editor.status.value"
      eyebrow="食材采购"
      :title="props.mode === 'create' ? '新建食材采购' : '食材采购'"
    >
      <el-alert
        v-if="!editor.editable.value"
        class="form-note"
        title="当前单据已进入流程，不可继续编辑。"
        show-icon
        type="info"
        :closable="false"
      />

      <el-form
        ref="formRef"
        :disabled="!editor.editable.value"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent
      >
        <FormSection title="采购信息">
          <div class="ui-fields" :class="{ 'is-compact': isCompact }">
            <el-form-item label="单据编号">
              <div class="contract-readonly-value">
                {{ editor.documentNumber.value ?? '保存后自动生成' }}
              </div>
            </el-form-item>
            <el-form-item label="申请部门">
              <div class="contract-readonly-value">{{ session.user?.departmentName ?? '-' }}</div>
            </el-form-item>
            <el-form-item label="申请人">
              <div class="contract-readonly-value">{{ session.user?.displayName ?? '-' }}</div>
            </el-form-item>
            <el-form-item label="申请日期" prop="applicationDate">
              <el-date-picker
                v-model="form.applicationDate"
                format="YYYY-MM-DD"
                placeholder="请选择申请日期"
                type="date"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
            <el-form-item label="班组" prop="teamName">
              <el-input
                v-model="form.teamName"
                aria-label="班组"
                :maxlength="100"
                placeholder="如：中厨房 / 宴会厅"
              />
            </el-form-item>
          </div>
        </FormSection>

        <FormSection
          title="请购明细"
          description="品类、品名支持拼音首字母检索（如 wr → 五花肉），也可直接手填；单价可暂不填写，审批领导可在审核时补充或调整。"
        >
          <div class="food-items__scroll">
            <div class="food-items">
              <div class="food-items__row food-items__row--head" aria-hidden="true">
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
                v-for="(item, index) in itemDrafts"
                :key="index"
                class="food-items__row"
                :data-testid="`food-item-row-${index}`"
              >
                <PinyinAutocomplete
                  v-model="item.category"
                  :disabled="!editor.editable.value"
                  :maxlength="50"
                  :options="FOOD_CATEGORIES"
                  placeholder="如：蔬菜类"
                />
                <PinyinAutocomplete
                  v-model="item.name"
                  :disabled="!editor.editable.value"
                  :maxlength="200"
                  :options="rowItems(item)"
                  placeholder="如：五花肉"
                />
                <el-input
                  v-model="item.specification"
                  :disabled="!editor.editable.value"
                  :maxlength="200"
                  placeholder="如：散装 / 5kg"
                  aria-label="规格"
                />
                <el-input-number
                  v-model="item.quantity"
                  :controls="false"
                  :disabled="!editor.editable.value"
                  :min="1"
                  :precision="0"
                  aria-label="数量"
                />
                <el-input
                  v-model="item.unit"
                  :disabled="!editor.editable.value"
                  :maxlength="20"
                  placeholder="斤 / 箱"
                  aria-label="单位"
                />
                <el-input
                  v-model="item.requirement"
                  :disabled="!editor.editable.value"
                  :maxlength="200"
                  placeholder="如：新鲜、切块"
                  aria-label="要求"
                />
                <MoneyInput
                  v-model="item.unitPriceCents"
                  aria-label="单价"
                  :disabled="!editor.editable.value"
                />
                <span class="food-items__subtotal">{{ rowSubtotal(item) }}</span>
                <el-input
                  v-model="item.remark"
                  :disabled="!editor.editable.value"
                  :maxlength="300"
                  placeholder="备注"
                  aria-label="备注"
                />
                <el-button
                  :aria-label="`删除第 ${index + 1} 行明细`"
                  :disabled="!editor.editable.value"
                  :icon="Delete"
                  text
                  type="danger"
                  @click="removeItem(index)"
                />
              </div>
            </div>
          </div>
          <div class="food-items__footer">
            <el-button :disabled="!editor.editable.value" :icon="Plus" text @click="addItem">
              添加明细行
            </el-button>
            <span>合计：<strong>{{ formatMoney(totalCents) }}</strong></span>
          </div>
        </FormSection>

        <FormSection title="相关附件">
          <el-form-item prop="attachments">
            <AttachmentUploadField v-model="form.attachments" :readonly="!editor.editable.value" />
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

<style scoped src="../../contract/contract-form.css"></style>

<style scoped>
.food-items__scroll { overflow-x: auto; padding-bottom: 4px; }
.food-items { display: grid; min-width: 1120px; gap: 10px; }
.food-items__row {
  display: grid;
  grid-template-columns:
    minmax(100px, 0.8fr) minmax(130px, 1.1fr) minmax(100px, 0.9fr) 84px 76px
    minmax(120px, 1fr) 116px 92px minmax(120px, 1fr) 40px;
  align-items: center;
  gap: 8px;
}
.food-items__row--head { color: var(--color-text-tertiary); font-size: 13px; }
.food-items__subtotal {
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
}
.food-items__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 6px;
  color: var(--color-text-secondary);
  font-size: 13px;
}
.food-items__footer strong { color: var(--color-text); font-size: 16px; }
</style>
