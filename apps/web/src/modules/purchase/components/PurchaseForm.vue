<script setup lang="ts">
import { Delete, Plus } from '@element-plus/icons-vue';
import type { FormInstance, FormRules } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import AttachmentField from '../../../shared/components/AttachmentField.vue';
import DocumentFormLayout from '../../../shared/components/DocumentFormLayout.vue';
import FormSection from '../../../shared/components/FormSection.vue';
import MoneyInput from '../../../shared/components/MoneyInput.vue';
import WorkflowSidebar from '../../../shared/components/WorkflowSidebar.vue';
import { formatMoney } from '../../../shared/format';
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
  subtotalCents: 0,
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

const itemSubtotalCents = computed(() =>
  itemDrafts.value.reduce(
    (sum, item) => sum + Math.max(0, item.unitPriceCents) * Math.max(1, item.quantity),
    0,
  ),
);
const computedTotalCents = computed(
  () =>
    itemSubtotalCents.value +
    (form.tariffCents ?? 0) +
    (form.vatCents ?? 0) +
    (form.otherFeesCents ?? 0),
);

function addItem(): void {
  itemDrafts.value = [
    ...itemDrafts.value,
    { name: '', specification: '', unit: '', quantity: 1, unitPriceCents: 0 },
  ];
}

function removeItem(index: number): void {
  itemDrafts.value = itemDrafts.value.filter((_, current) => current !== index);
}

function syncAmountFromItems(): void {
  if (itemDrafts.value.length > 0) form.amountCents = computedTotalCents.value;
}

const rules: FormRules<PurchasePayload> = {
  name: [
    { required: true, whitespace: true, message: '请输入采购名称' },
    { max: 200, message: '采购名称不能超过 200 个字' },
  ],
  amountCents: [{ required: true, type: 'number', min: 0, message: '采购金额不能小于 0' }],
  counterpartyName: [
    { required: true, whitespace: true, message: '请输入乙方单位' },
    { max: 300, message: '乙方单位不能超过 300 个字' },
  ],
  counterpartyContact: [{ max: 100, message: '乙方联系人不能超过 100 个字' }],
  counterpartyPhone: [{ max: 50, message: '联系电话不能超过 50 个字' }],
  paymentMethod: [{ max: 100, message: '付款方式不能超过 100 个字' }],
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
  validate: () => validateDocumentForm(formRef.value),
  payload: () => ({
    ...form,
    amountCents:
      itemDrafts.value.length > 0 ? computedTotalCents.value : form.amountCents,
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
      subtotalCents: data.subtotalCents ?? 0,
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
                {{ editor.documentNumber.value ?? '提交后自动生成 CG 单号' }}
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
            <el-form-item label="采购金额" prop="amountCents">
              <MoneyInput v-model="form.amountCents" aria-label="采购金额" />
            </el-form-item>
            <el-form-item label="乙方单位" prop="counterpartyName">
              <el-input
                v-model="form.counterpartyName"
                :maxlength="300"
                placeholder="请按证照登记名称完整填写"
              />
            </el-form-item>
            <el-form-item label="乙方联系人" prop="counterpartyContact">
              <el-input
                v-model="form.counterpartyContact"
                :maxlength="100"
                placeholder="请输入乙方联系人姓名"
              />
            </el-form-item>
            <el-form-item label="联系电话" prop="counterpartyPhone">
              <el-input
                v-model="form.counterpartyPhone"
                :maxlength="50"
                placeholder="请输入乙方联系电话"
              />
            </el-form-item>
            <el-form-item label="付款方式" prop="paymentMethod">
              <el-input
                v-model="form.paymentMethod"
                :maxlength="100"
                placeholder="如：银行转账、货到付款"
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

        <FormSection title="采购明细" description="按线下采购申请单填写品名、规格、订购数量与单价，总价自动汇总。">
          <div class="purchase-items">
            <div class="purchase-items__row purchase-items__row--head" aria-hidden="true">
              <span>品名</span>
              <span>规格</span>
              <span>单位</span>
              <span>订购数量</span>
              <span>单价（元）</span>
              <span class="purchase-items__right">总价</span>
              <span />
            </div>
            <div v-for="(item, index) in itemDrafts" :key="index" class="purchase-items__row">
              <el-input v-model="item.name" :disabled="!editor.editable.value" :maxlength="200" aria-label="品名" placeholder="如：HP126nw Plus 打印机" />
              <el-input v-model="item.specification" :disabled="!editor.editable.value" :maxlength="200" aria-label="规格" placeholder="规格型号" />
              <el-input v-model="item.unit" :disabled="!editor.editable.value" :maxlength="20" aria-label="单位" placeholder="台 / 箱" />
              <el-input-number v-model="item.quantity" :controls="false" :disabled="!editor.editable.value" :min="1" :precision="0" aria-label="订购数量" @change="syncAmountFromItems" />
              <el-input-number v-model="item.unitPriceCents" :disabled="!editor.editable.value" :min="0" :precision="0" aria-label="单价分" @change="syncAmountFromItems" />
              <span class="purchase-items__subtotal">{{ formatMoney(item.unitPriceCents * item.quantity) }}</span>
              <el-button :aria-label="`删除第 ${index + 1} 行明细`" :disabled="!editor.editable.value" :icon="Delete" text type="danger" @click="removeItem(index)" />
            </div>
            <el-button :disabled="!editor.editable.value" :icon="Plus" text @click="addItem">添加明细行</el-button>
          </div>
        </FormSection>

        <FormSection title="类别与费用">
          <div class="ui-fields" :class="{ 'is-compact': isCompact }">
            <el-form-item label="采购类别" prop="itemCategory">
              <el-select v-model="form.itemCategory">
                <el-option label="非库存品" value="NON_STOCK" />
                <el-option label="库存用品" value="STOCK" />
                <el-option label="工程用品" value="ENGINEERING" />
                <el-option label="固定资产" value="FIXED_ASSET" />
              </el-select>
            </el-form-item>
            <el-form-item label="预算" prop="budgetType">
              <el-radio-group v-model="form.budgetType">
                <el-radio-button value="NONE">无预算</el-radio-button>
                <el-radio-button value="BUDGET">有预算</el-radio-button>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="关税" prop="tariffCents">
              <MoneyInput v-model="form.tariffCents" aria-label="关税" @update:model-value="syncAmountFromItems" />
            </el-form-item>
            <el-form-item label="增值税" prop="vatCents">
              <MoneyInput v-model="form.vatCents" aria-label="增值税" @update:model-value="syncAmountFromItems" />
            </el-form-item>
            <el-form-item label="其它费用" prop="otherFeesCents">
              <MoneyInput v-model="form.otherFeesCents" aria-label="其它费用" @update:model-value="syncAmountFromItems" />
            </el-form-item>
            <el-form-item label="总价">
              <div class="contract-readonly-value">{{ formatMoney(form.amountCents) }}</div>
            </el-form-item>
          </div>
        </FormSection>

        <FormSection title="理由与供应商">
          <div class="ui-fields" :class="{ 'is-compact': isCompact }">
            <el-form-item class="ui-field-full" label="申请理由及用途" prop="reason">
              <el-input v-model="form.reason" type="textarea" :autosize="{ minRows: 3, maxRows: 6 }" :maxlength="1000" placeholder="如：打印、复印、扫描文件资料用" show-word-limit />
            </el-form-item>
            <el-form-item label="需用日期" prop="requiredDate">
              <el-date-picker :model-value="form.requiredDate" format="YYYY/MM/DD" placeholder="请选择需用日期" value-format="YYYY-MM-DD" @update:model-value="form.requiredDate = $event || null" />
            </el-form-item>
            <el-form-item label="经办人" prop="handlerName">
              <el-input v-model="form.handlerName" :maxlength="100" placeholder="填写经办人姓名" />
            </el-form-item>
            <el-form-item label="供应商 A" prop="supplierA">
              <el-input v-model="form.supplierA" :maxlength="200" />
            </el-form-item>
            <el-form-item label="供应商 B" prop="supplierB">
              <el-input v-model="form.supplierB" :maxlength="200" />
            </el-form-item>
            <el-form-item label="供应商 C" prop="supplierC">
              <el-input v-model="form.supplierC" :maxlength="200" />
            </el-form-item>
            <el-form-item label="采购订单号" prop="purchaseOrderNo">
              <el-input v-model="form.purchaseOrderNo" :maxlength="100" placeholder="采购部回填" />
            </el-form-item>
          </div>
        </FormSection>

        <FormSection title="附件">
          <el-form-item prop="attachments">
            <AttachmentField v-model="form.attachments" :readonly="!editor.editable.value" />
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
