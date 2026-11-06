<script setup lang="ts">
import { Delete, Plus } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import { onMounted, reactive, ref } from 'vue';
import AttachmentUploadField from '../../../shared/components/AttachmentUploadField.vue';
import DocumentFormLayout from '../../../shared/components/DocumentFormLayout.vue';
import FormSection from '../../../shared/components/FormSection.vue';
import WorkflowSidebar from '../../../shared/components/WorkflowSidebar.vue';
import { useSessionStore } from '../../../shared/session';
import { useWorkflowStore } from '../../../shared/workflow';
import { useLayoutMode } from '../../../ui/useLayoutMode';
import ContractDocumentActions from '../../contract/components/ContractDocumentActions.vue';
import type { EditorMode } from '../../contract/contract.types';
import {
  useContractDocumentEditor,
  validateDocumentForm,
} from '../../contract/useContractDocumentEditor';
import { PURCHASE_API, PURCHASE_ROUTE_NAMES } from '../purchase.config';
import type {
  PurchaseData,
  PurchaseItemDraft,
  PurchasePayload,
} from '../purchase.types';

const props = defineProps<{ mode: EditorMode; documentId?: string }>();
const formRef = ref<FormInstance>();
const session = useSessionStore();
const workflow = useWorkflowStore();
const { isCompact } = useLayoutMode();

const form = reactive<PurchasePayload>({
  name: '',
  amountCents: 0,
  counterpartyName: '',
  counterpartyContact: null,
  counterpartyPhone: null,
  paymentMethod: null,
  expectedDeliveryDate: null,
  remark: null,
  itemCategory: 'NON_STOCK',
  budgetType: 'NONE',
  tariffCents: 0,
  vatCents: 0,
  otherFeesCents: 0,
  reason: '',
  handlerName: '',
  supplierA: '',
  supplierB: '',
  supplierC: '',
  requiredDate: null,
  purchaseOrderNo: '',
  items: [],
  attachments: [],
});

const itemDrafts = ref<PurchaseItemDraft[]>([
  { name: '', specification: '', unit: '', quantity: 1, unitPriceCents: 0 },
]);

/** 采购明细只要求品名、订购数量和单位，缺项时给出明确提示。 */
function validateItemRows(): void {
  const rows = itemDrafts.value.filter(
    (item) => item.name.trim().length > 0 || item.unit.trim().length > 0,
  );
  if (rows.length === 0) {
    throw new Error('请至少填写一行采购明细（品名、订购数量、单位）');
  }
  const incomplete = rows.find(
    (item) => !item.name.trim() || !item.unit.trim() || item.quantity < 1,
  );
  if (incomplete) {
    throw new Error('采购明细需填写品名、订购数量和单位');
  }
}

function addItem(): void {
  itemDrafts.value = [
    ...itemDrafts.value,
    { name: '', specification: '', unit: '', quantity: 1, unitPriceCents: 0 },
  ];
}

function removeItem(index: number): void {
  itemDrafts.value = itemDrafts.value.filter((_, current) => current !== index);
}

const rules: FormRules<PurchasePayload> = {
  name: [
    { required: true, whitespace: true, message: '请输入采购名称' },
    { max: 200, message: '采购名称不能超过 200 个字' },
  ],
  remark: [{ max: 1000, message: '备注不能超过 1000 个字' }],
};

const editor = useContractDocumentEditor<PurchaseData, PurchasePayload>({
  mode: props.mode,
  documentId: props.documentId,
  documentType: 'PURCHASE_APPROVAL',
  createPath: PURCHASE_API.purchases,
  itemPath: PURCHASE_API.purchase,
  editRouteName: PURCHASE_ROUTE_NAMES.edit,
  listRouteName: PURCHASE_ROUTE_NAMES.list,
  validate: async () => {
    await validateDocumentForm(formRef.value);
    validateItemRows();
  },
  payload: () => ({
    ...form,
    items: itemDrafts.value
      .filter((item) => item.name.trim().length > 0)
      .map((item) => ({
        ...item,
        name: item.name.trim(),
        specification: item.specification.trim(),
        unit: item.unit.trim(),
      })),
    attachments: [...form.attachments],
  }),
  assign: (data) => {
    Object.assign(form, {
      name: data.name,
      amountCents: data.amountCents,
      counterpartyName: data.counterpartyName,
      counterpartyContact: data.counterpartyContact,
      counterpartyPhone: data.counterpartyPhone,
      paymentMethod: data.paymentMethod,
      expectedDeliveryDate: data.expectedDeliveryDate,
      remark: data.remark,
      itemCategory: data.itemCategory ?? 'NON_STOCK',
      budgetType: data.budgetType ?? 'NONE',
      tariffCents: data.tariffCents ?? 0,
      vatCents: data.vatCents ?? 0,
      otherFeesCents: data.otherFeesCents ?? 0,
      reason: data.reason ?? '',
      handlerName: data.handlerName ?? '',
      supplierA: data.supplierA ?? '',
      supplierB: data.supplierB ?? '',
      supplierC: data.supplierC ?? '',
      requiredDate: data.requiredDate ?? null,
      purchaseOrderNo: data.purchaseOrderNo ?? '',
      attachments: [...data.attachments],
    });
    itemDrafts.value = (data.items ?? []).map((item) => ({
      name: item.name,
      specification: item.specification,
      unit: item.unit,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
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
      :description="props.mode === 'create' ? '采购事项的正式审批单' : '编辑采购审批单'"
      :document-number="editor.documentNumber.value"
      :loading="editor.loading.value"
      :revision="editor.revision.value"
      :status="editor.status.value"
      eyebrow="采购管理"
      :title="props.mode === 'create' ? '新建采购审批' : '采购审批'"
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
            <el-form-item label="经办人">
              <div class="contract-readonly-value">{{ session.user?.displayName ?? '-' }}</div>
            </el-form-item>
            <el-form-item class="ui-field-full" label="采购名称" prop="name">
              <el-input
                v-model="form.name"
                :maxlength="200"
                placeholder="请输入采购事项名称"
                show-word-limit
              />
            </el-form-item>
            <el-form-item label="期望到货时间" prop="expectedDeliveryDate">
              <el-date-picker
                :model-value="form.expectedDeliveryDate"
                format="YYYY/MM/DD"
                placeholder="请选择期望到货时间"
                value-format="YYYY-MM-DD"
                @update:model-value="form.expectedDeliveryDate = $event || null"
              />
            </el-form-item>
            <el-form-item class="ui-field-full" label="备注" prop="remark">
              <el-input
                v-model="form.remark"
                type="textarea"
                :autosize="{ minRows: 3, maxRows: 6 }"
                :maxlength="1000"
                placeholder="可选，补充其他说明"
              />
            </el-form-item>
          </div>
        </FormSection>

        <FormSection title="采购明细" description="填写品名、订购数量和单位即可。">
          <div class="purchase-items">
            <div class="purchase-items__row purchase-items__row--head" aria-hidden="true">
              <span>品名</span>
              <span>订购数量</span>
              <span>单位</span>
              <span />
            </div>
            <div v-for="(item, index) in itemDrafts" :key="index" class="purchase-items__row">
              <el-input v-model="item.name" :disabled="!editor.editable.value" :maxlength="200" aria-label="品名" placeholder="如：客房雨伞" />
              <el-input-number v-model="item.quantity" :controls="false" :disabled="!editor.editable.value" :min="1" :precision="0" aria-label="订购数量" />
              <el-input v-model="item.unit" :disabled="!editor.editable.value" :maxlength="20" aria-label="单位" placeholder="台 / 箱 / 把" />
              <el-button :aria-label="`删除第 ${index + 1} 行明细`" :disabled="!editor.editable.value" :icon="Delete" text type="danger" @click="removeItem(index)" />
            </div>
            <el-button :disabled="!editor.editable.value" :icon="Plus" text @click="addItem">添加明细行</el-button>
          </div>
        </FormSection>

        <FormSection title="申请理由">
          <el-form-item label="申请理由及用途" prop="reason">
            <el-input v-model="form.reason" type="textarea" :autosize="{ minRows: 3, maxRows: 6 }" :maxlength="1000" placeholder="如：打印、复印、扫描文件资料用" show-word-limit />
          </el-form-item>
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
.purchase-items { display: grid; gap: 10px; }
.purchase-items__row { display: grid; grid-template-columns: minmax(0, 1fr) 150px 130px 40px; align-items: center; gap: 8px; }
.purchase-items__row--head { color: var(--color-text-tertiary); font-size: 13px; }
html[data-layout='compact'] .purchase-items__row { grid-template-columns: minmax(0, 1fr) 110px 96px 40px; }
</style>
