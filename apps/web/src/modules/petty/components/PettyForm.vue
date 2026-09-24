<script setup lang="ts">
import { Delete, Plus } from '@element-plus/icons-vue';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { apiRequest } from '../../../shared/api';
import AttachmentField from '../../../shared/components/AttachmentField.vue';
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
import { PETTY_API, PETTY_ROUTE_NAMES } from '../petty.config';
import type {
  PettyItemDraft,
  PettyMaterial,
  PettyProcurementData,
  PettyProcurementPayload,
} from '../petty.types';
import { formatYuan } from '../petty.format';

const props = defineProps<{ mode: EditorMode; documentId?: string }>();
const formRef = ref<FormInstance>();
const session = useSessionStore();
const workflow = useWorkflowStore();
const { isCompact } = useLayoutMode();

const materials = ref<PettyMaterial[]>([]);
const itemDrafts = ref<PettyItemDraft[]>([{ materialId: null, quantity: 1 }]);

const form = reactive<Pick<PettyProcurementPayload, 'title' | 'remark' | 'attachments'>>({
  title: '',
  remark: null,
  attachments: [],
});

const rules: FormRules<Pick<PettyProcurementPayload, 'title' | 'remark'>> = {
  title: [
    { required: true, whitespace: true, message: '请输入申请标题' },
    { max: 200, message: '申请标题不能超过 200 个字' },
  ],
  remark: [{ max: 1000, message: '备注不能超过 1000 个字' }],
};

const materialMap = computed(() => new Map(materials.value.map((item) => [item.id, item])));
const materialOptions = computed(() =>
  materials.value
    .filter((item) => item.active)
    .map((item) => ({
      value: item.id,
      label: `${item.name}（${item.brand}）· ${formatYuan(item.unitPriceCents)}/${item.unit || '件'}`,
    })),
);

const totalAmountCents = computed(() =>
  itemDrafts.value.reduce((sum, draft) => {
    const material = draft.materialId ? materialMap.value.get(draft.materialId) : null;
    return material ? sum + material.unitPriceCents * draft.quantity : sum;
  }, 0),
);

function subtotal(draft: PettyItemDraft): string {
  const material = draft.materialId ? materialMap.value.get(draft.materialId) : null;
  return material ? formatYuan(material.unitPriceCents * draft.quantity) : '-';
}

function materialOf(draft: PettyItemDraft): PettyMaterial | null {
  return draft.materialId ? (materialMap.value.get(draft.materialId) ?? null) : null;
}

function selectMaterial(draft: PettyItemDraft, value: string | null | undefined): void {
  draft.materialId = value || null;
}

function updateQuantity(draft: PettyItemDraft, value: unknown): void {
  // 数量列始终保持为不小于 1 的整数，避免合计金额出现空值。
  draft.quantity = typeof value === 'number' && Number.isFinite(value) ? Math.max(1, value) : 1;
}

function addItem(): void {
  itemDrafts.value = [...itemDrafts.value, { materialId: null, quantity: 1 }];
}

function removeItem(index: number): void {
  itemDrafts.value = itemDrafts.value.filter((_, current) => current !== index);
}

const editor = useContractDocumentEditor<PettyProcurementData, PettyProcurementPayload>({
  mode: props.mode,
  documentId: props.documentId,
  documentType: 'PETTY_PROCUREMENT',
  createPath: PETTY_API.procurements,
  itemPath: PETTY_API.procurement,
  editRouteName: PETTY_ROUTE_NAMES.edit,
  listRouteName: PETTY_ROUTE_NAMES.list,
  validate: async () => {
    await validateDocumentForm(formRef.value);
    const selected = itemDrafts.value.filter((draft) => draft.materialId);
    if (selected.length === 0) {
      ElMessage.warning('请至少从物资库选择一项物资');
      throw { errorFields: [] };
    }
  },
  payload: () => ({
    ...form,
    attachments: [...form.attachments],
    items: itemDrafts.value
      .filter((draft): draft is PettyItemDraft & { materialId: string } =>
        Boolean(draft.materialId),
      )
      .map((draft) => ({ materialId: draft.materialId, quantity: draft.quantity })),
  }),
  assign: (data) => {
    Object.assign(form, {
      title: data.title,
      remark: data.remark,
      attachments: [...data.attachments],
    });
    itemDrafts.value = data.items.map((item) => ({
      materialId: item.materialId,
      quantity: item.quantity,
    }));
  },
});

async function loadMaterials(): Promise<void> {
  materials.value = await apiRequest<PettyMaterial[]>(PETTY_API.materials);
}

onMounted(() => {
  void editor.initialize([session.ensureSession(), workflow.refresh(), loadMaterials()]);
});
</script>

<template>
  <div class="contract-document-form">
    <DocumentFormLayout
      :description="props.mode === 'create' ? '从物资库勾选商品并填写数量' : '编辑零星采买申请'"
      :document-number="editor.documentNumber.value"
      :loading="editor.loading.value"
      :revision="editor.revision.value"
      :status="editor.status.value"
      eyebrow="零星采买"
      :title="props.mode === 'create' ? '新建零星采买' : '零星采买'"
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
        <FormSection title="申请信息">
          <div class="ui-fields" :class="{ 'is-compact': isCompact }">
            <el-form-item label="单据编号">
              <div class="contract-readonly-value">
                {{ editor.documentNumber.value ?? '提交后自动生成 LX 单号' }}
              </div>
            </el-form-item>
            <el-form-item label="申请人">
              <div class="contract-readonly-value">{{ session.user?.displayName ?? '-' }}</div>
            </el-form-item>
            <el-form-item class="ui-field-full" label="申请标题" prop="title">
              <el-input
                v-model="form.title"
                :maxlength="200"
                placeholder="如：后厨食材周度采买"
                show-word-limit
              />
            </el-form-item>
          </div>
        </FormSection>

        <FormSection title="采买明细" description="从物资库选择物资并填写数量，金额按物资库单价自动计算。">
          <div class="petty-items">
            <div v-if="!isCompact" class="petty-items__scroll">
              <div class="petty-items__row petty-items__row--head" aria-hidden="true">
                <span>物资（品牌 · 单价）</span>
                <span>数量</span>
                <span>供货单位</span>
                <span class="petty-items__right">小计</span>
                <span class="petty-items__right">操作</span>
              </div>
              <div v-for="(draft, index) in itemDrafts" :key="index" class="petty-items__row">
                <el-select
                  :disabled="!editor.editable.value"
                  :model-value="draft.materialId"
                  aria-label="采购物资"
                  clearable
                  filterable
                  placeholder="从物资库选择物资"
                  @update:model-value="selectMaterial(draft, $event)"
                >
                  <el-option
                    v-for="option in materialOptions"
                    :key="option.value"
                    :label="option.label"
                    :value="option.value"
                  />
                </el-select>
                <el-input-number
                  :controls="false"
                  :disabled="!editor.editable.value"
                  :min="1"
                  :model-value="draft.quantity"
                  :precision="0"
                  aria-label="采购数量"
                  @update:model-value="updateQuantity(draft, $event)"
                />
                <span class="petty-items__meta">{{ materialOf(draft)?.supplierName ?? '-' }}</span>
                <span class="petty-items__subtotal">小计 {{ subtotal(draft) }}</span>
                <span class="petty-items__row-actions">
                  <el-button
                    :aria-label="`删除第 ${index + 1} 项物资`"
                    :disabled="itemDrafts.length <= 1 || !editor.editable.value"
                    :icon="Delete"
                    text
                    type="danger"
                    @click="removeItem(index)"
                  />
                </span>
              </div>
            </div>

            <div v-else class="petty-items__cards">
              <article v-for="(draft, index) in itemDrafts" :key="index" class="petty-item-card">
                <header>
                  <div>
                    <span class="ui-text-muted">物资 {{ String(index + 1).padStart(2, '0') }}</span>
                    <h3>{{ materialOf(draft)?.name ?? '待选择物资' }}</h3>
                  </div>
                  <el-button
                    :aria-label="`删除第 ${index + 1} 项物资`"
                    :disabled="itemDrafts.length <= 1 || !editor.editable.value"
                    text
                    type="danger"
                    @click="removeItem(index)"
                  >
                    删除
                  </el-button>
                </header>
                <el-form label-position="top" :disabled="!editor.editable.value">
                  <el-form-item label="物资">
                    <el-select
                      :model-value="draft.materialId"
                      clearable
                      filterable
                      placeholder="从物资库选择物资"
                      @update:model-value="selectMaterial(draft, $event)"
                    >
                      <el-option
                        v-for="option in materialOptions"
                        :key="option.value"
                        :label="option.label"
                        :value="option.value"
                      />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="数量">
                    <el-input-number
                      :min="1"
                      :model-value="draft.quantity"
                      :precision="0"
                      aria-label="采购数量"
                      controls-position="right"
                      @update:model-value="updateQuantity(draft, $event)"
                    />
                  </el-form-item>
                  <el-form-item label="供货单位">{{ materialOf(draft)?.supplierName ?? '-' }}</el-form-item>
                  <el-form-item label="小计">{{ subtotal(draft) }}</el-form-item>
                </el-form>
              </article>
            </div>

            <el-button
              class="petty-items__add"
              :disabled="!editor.editable.value"
              :icon="Plus"
              @click="addItem"
            >
              添加物资
            </el-button>
            <div class="petty-items__total">合计金额：{{ formatYuan(totalAmountCents) }}</div>
            <p v-if="!isCompact" class="petty-items__hint ui-text-muted">
              明细列较多，窄屏时可左右滚动查看全部字段。
            </p>
          </div>
        </FormSection>

        <FormSection title="备注与附件">
          <div class="ui-fields" :class="{ 'is-compact': isCompact }">
            <el-form-item class="ui-field-full" label="申请备注" prop="remark">
              <el-input
                v-model="form.remark"
                type="textarea"
                :autosize="{ minRows: 3, maxRows: 6 }"
                :maxlength="1000"
                placeholder="可选，补充采买说明"
              />
            </el-form-item>
            <el-form-item class="ui-field-full" label="附件" prop="attachments">
              <AttachmentField v-model="form.attachments" :readonly="!editor.editable.value" />
            </el-form-item>
          </div>
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
.petty-items {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 12px;
}

.petty-items__scroll {
  min-width: 0;
  overflow-x: auto;
}

.petty-items__row {
  display: grid;
  min-width: 688px;
  grid-template-columns: minmax(220px, 1.5fr) 120px minmax(130px, 1fr) 118px 52px;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--color-border-soft);
}

.petty-items__row--head {
  padding-bottom: 6px;
  color: var(--color-text-tertiary);
  font-size: 12px;
}

.petty-items__row :deep(.el-select),
.petty-items__row :deep(.el-input-number),
.petty-item-card :deep(.el-select),
.petty-item-card :deep(.el-input-number) {
  min-width: 0;
  width: 100%;
}

.petty-items__right,
.petty-items__subtotal,
.petty-items__row-actions {
  text-align: right;
}

.petty-items__subtotal {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.petty-items__row-actions {
  display: flex;
  justify-content: flex-end;
}

.petty-items__meta {
  min-width: 0;
  color: var(--color-text-secondary);
  font-size: 13px;
  overflow-wrap: anywhere;
}

.petty-items__cards {
  display: grid;
  gap: 16px;
}

.petty-item-card {
  min-width: 0;
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-canvas);
}

.petty-item-card header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.petty-item-card header > div {
  min-width: 0;
}

.petty-item-card h3 {
  margin: 4px 0 0;
  font-size: 17px;
  overflow-wrap: anywhere;
}

.petty-item-card :deep(.el-form-item) {
  margin-bottom: 16px;
}

.petty-items__add {
  width: 100%;
}

.petty-items__total {
  text-align: right;
  font-size: 16px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.petty-items__hint {
  margin: 0;
  font-size: 12px;
}
</style>
