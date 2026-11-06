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
import { MATERIAL_LOSS_API, MATERIAL_LOSS_ROUTE_NAMES } from '../material-loss.config';
import type {
  MaterialLossData,
  MaterialLossItemDraft,
  MaterialLossPayload,
} from '../material-loss.types';

const props = defineProps<{ mode: EditorMode; documentId?: string }>();
const formRef = ref<FormInstance>();
const session = useSessionStore();
const workflow = useWorkflowStore();
const { isCompact } = useLayoutMode();

const form = reactive<MaterialLossPayload>({
  applicationDate: todayIso(),
  reason: '',
  items: [],
  attachments: [],
});

const emptyItem = (): MaterialLossItemDraft => ({
  name: '',
  specification: '',
  unit: '',
  quantity: 1,
  unitPriceCents: null,
  remark: '',
});

const itemDrafts = ref<MaterialLossItemDraft[]>([emptyItem()]);

const totalCents = computed(() =>
  itemDrafts.value.reduce((sum, item) => sum + (item.unitPriceCents ?? 0) * item.quantity, 0),
);

function validateItemRows(): void {
  const rows = itemDrafts.value.filter(
    (item) => item.name.trim().length > 0 || item.unit.trim().length > 0,
  );
  if (rows.length === 0) {
    throw new Error('请至少填写一行报损明细（品名、数量、单位）');
  }
  const incomplete = rows.find(
    (item) => !item.name.trim() || !item.unit.trim() || item.quantity < 1,
  );
  if (incomplete) {
    throw new Error('报损明细需填写品名、数量和单位');
  }
}

function addItem(): void {
  itemDrafts.value = [...itemDrafts.value, emptyItem()];
}

function removeItem(index: number): void {
  itemDrafts.value = itemDrafts.value.filter((_, current) => current !== index);
}

function rowSubtotal(item: MaterialLossItemDraft): string {
  return item.unitPriceCents === null
    ? '待填'
    : formatMoney(item.unitPriceCents * item.quantity);
}

const rules: FormRules<MaterialLossPayload> = {
  applicationDate: [{ required: true, message: '请选择报损日期' }],
  reason: [
    { required: true, whitespace: true, message: '请输入报损原因' },
    { max: 1000, message: '报损原因不能超过 1000 个字' },
  ],
};

const editor = useContractDocumentEditor<MaterialLossData, MaterialLossPayload>({
  mode: props.mode,
  documentId: props.documentId,
  documentType: 'MATERIAL_LOSS',
  createPath: MATERIAL_LOSS_API.losses,
  itemPath: MATERIAL_LOSS_API.loss,
  editRouteName: MATERIAL_LOSS_ROUTE_NAMES.edit,
  listRouteName: MATERIAL_LOSS_ROUTE_NAMES.list,
  validate: async () => {
    await validateDocumentForm(formRef.value);
    validateItemRows();
  },
  payload: () => ({
    applicationDate: form.applicationDate,
    reason: form.reason.trim(),
    items: itemDrafts.value
      .filter((item) => item.name.trim().length > 0)
      .map((item) => ({
        name: item.name.trim(),
        specification: item.specification.trim(),
        unit: item.unit.trim(),
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        remark: item.remark.trim(),
      })),
    attachments: [...form.attachments],
  }),
  assign: (data) => {
    form.applicationDate = data.applicationDate || todayIso();
    form.reason = data.reason ?? '';
    form.attachments = [...data.attachments];
    itemDrafts.value = (data.items ?? []).map((item) => ({
      name: item.name,
      specification: item.specification,
      unit: item.unit,
      quantity: item.quantity,
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
      :description="props.mode === 'create' ? '登记报损物资与原因' : '编辑物资报损单'"
      :document-number="editor.documentNumber.value"
      :loading="editor.loading.value"
      :revision="editor.revision.value"
      :status="editor.status.value"
      eyebrow="物资管理"
      :title="props.mode === 'create' ? '新建物资报损' : '物资报损'"
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
        <FormSection title="报损信息">
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
            <el-form-item label="报损日期" prop="applicationDate">
              <el-date-picker
                v-model="form.applicationDate"
                format="YYYY-MM-DD"
                placeholder="请选择报损日期"
                type="date"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </div>
        </FormSection>

        <FormSection title="报损原因">
          <el-form-item label="报损原因及说明" prop="reason">
            <el-input
              v-model="form.reason"
              :maxlength="1000"
              placeholder="如：存放过期、破损无法使用"
              :rows="4"
              show-word-limit
              type="textarea"
            />
          </el-form-item>
        </FormSection>

        <FormSection title="报损明细" description="填写品名、数量和单位即可，原值可留空。">
          <div class="loss-items__scroll">
            <div class="loss-items">
              <div class="loss-items__row loss-items__row--head" aria-hidden="true">
                <span>品名</span>
                <span>规格</span>
                <span>数量</span>
                <span>单位</span>
                <span>单价</span>
                <span>金额</span>
                <span>备注</span>
                <span />
              </div>
              <div
                v-for="(item, index) in itemDrafts"
                :key="index"
                class="loss-items__row"
                :data-testid="`loss-item-row-${index}`"
              >
                <el-input
                  v-model="item.name"
                  :disabled="!editor.editable.value"
                  :maxlength="200"
                  aria-label="品名"
                  placeholder="如：客房毛巾"
                />
                <el-input
                  v-model="item.specification"
                  :disabled="!editor.editable.value"
                  :maxlength="200"
                  aria-label="规格"
                  placeholder="如：白色 / 标准"
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
                  aria-label="单位"
                  placeholder="条 / 箱"
                />
                <MoneyInput
                  v-model="item.unitPriceCents"
                  aria-label="单价"
                  :disabled="!editor.editable.value"
                />
                <span class="loss-items__subtotal">{{ rowSubtotal(item) }}</span>
                <el-input
                  v-model="item.remark"
                  :disabled="!editor.editable.value"
                  :maxlength="300"
                  aria-label="备注"
                  placeholder="备注"
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
          <div class="loss-items__footer">
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
.loss-items__scroll { overflow-x: auto; padding-bottom: 4px; }
.loss-items { display: grid; min-width: 900px; gap: 10px; }
.loss-items__row {
  display: grid;
  grid-template-columns: minmax(150px, 1.4fr) minmax(130px, 1.1fr) 90px 80px 120px 96px minmax(130px, 1.1fr) 40px;
  align-items: center;
  gap: 8px;
}
.loss-items__row--head { color: var(--color-text-tertiary); font-size: 13px; }
.loss-items__subtotal { color: var(--color-text-secondary); font-variant-numeric: tabular-nums; }
.loss-items__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 6px;
  color: var(--color-text-secondary);
  font-size: 13px;
}
.loss-items__footer strong { color: var(--color-text); font-size: 16px; }
</style>
