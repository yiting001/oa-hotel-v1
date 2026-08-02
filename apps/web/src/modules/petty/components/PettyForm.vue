<script setup lang="ts">
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons-vue';
import type { FormInstance } from 'ant-design-vue';
import type { Rule } from 'ant-design-vue/es/form';
import { message } from 'ant-design-vue';
import { computed, onMounted, reactive, ref } from 'vue';
import { apiRequest } from '../../../shared/api';
import AttachmentField from '../../../shared/components/AttachmentField.vue';
import DocumentFormLayout from '../../../shared/components/DocumentFormLayout.vue';
import FormSection from '../../../shared/components/FormSection.vue';
import WorkflowSidebar from '../../../shared/components/WorkflowSidebar.vue';
import { useSessionStore } from '../../../shared/session';
import { useWorkflowStore } from '../../../shared/workflow';
import ContractDocumentActions from '../../contract/components/ContractDocumentActions.vue';
import type { EditorMode } from '../../contract/contract.types';
import { useContractDocumentEditor } from '../../contract/useContractDocumentEditor';
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

const materials = ref<PettyMaterial[]>([]);
const itemDrafts = ref<PettyItemDraft[]>([{ materialId: null, quantity: 1 }]);

const form = reactive<Pick<PettyProcurementPayload, 'title' | 'remark' | 'attachments'>>({
  title: '',
  remark: null,
  attachments: [],
});

const rules: Record<string, Rule[]> = {
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
    await formRef.value?.validate();
    const selected = itemDrafts.value.filter((draft) => draft.materialId);
    if (selected.length === 0) {
      message.warning('请至少从物资库选择一项物资');
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
      :title="props.mode === 'create' ? '新建零星采买' : '零星采买'"
    >
      <a-alert
        v-if="!editor.editable.value"
        message="当前单据已进入流程，不可继续编辑。"
        show-icon
        type="info"
      />

      <a-form
        ref="formRef"
        :disabled="!editor.editable.value"
        :model="form"
        :rules="rules"
        layout="vertical"
      >
        <FormSection title="申请信息">
          <div class="contract-form-grid">
            <a-form-item label="单据编号">
              <div class="contract-readonly-value">
                {{ editor.documentNumber.value ?? '提交后自动生成 LX 单号' }}
              </div>
            </a-form-item>
            <a-form-item label="申请人">
              <div class="contract-readonly-value">{{ session.user?.displayName ?? '-' }}</div>
            </a-form-item>
            <a-form-item class="contract-form-field--full" label="申请标题" name="title">
              <a-input
                v-model:value="form.title"
                :maxlength="200"
                placeholder="如：后厨食材周度采买"
                show-count
              />
            </a-form-item>
          </div>
        </FormSection>

        <FormSection title="采买明细">
          <div class="petty-items">
            <div v-for="(draft, index) in itemDrafts" :key="index" class="petty-items__row">
              <a-select
                v-model:value="draft.materialId"
                :options="materialOptions"
                class="petty-items__material"
                option-filter-prop="label"
                placeholder="从物资库选择物资"
                show-search
              />
              <a-input-number
                v-model:value="draft.quantity"
                :min="1"
                :precision="0"
                aria-label="采购数量"
              />
              <span class="petty-items__meta">
                {{ materialOf(draft) ? `${materialOf(draft)!.supplierName}` : '' }}
              </span>
              <span class="petty-items__subtotal">小计 {{ subtotal(draft) }}</span>
              <a-button
                :disabled="itemDrafts.length <= 1"
                danger
                type="text"
                @click="removeItem(index)"
              >
                <template #icon><DeleteOutlined /></template>
              </a-button>
            </div>
            <a-button block type="dashed" @click="addItem">
              <template #icon><PlusOutlined /></template>
              添加物资
            </a-button>
            <div class="petty-items__total">合计金额：{{ formatYuan(totalAmountCents) }}</div>
          </div>
        </FormSection>

        <FormSection title="备注与附件">
          <div class="contract-form-grid">
            <a-form-item class="contract-form-field--full" label="申请备注" name="remark">
              <a-textarea
                v-model:value="form.remark"
                :auto-size="{ minRows: 3, maxRows: 6 }"
                :maxlength="1000"
                placeholder="可选，补充采买说明"
              />
            </a-form-item>
            <a-form-item class="contract-form-field--full" label="附件" name="attachments">
              <AttachmentField v-model="form.attachments" />
            </a-form-item>
          </div>
        </FormSection>
      </a-form>

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
  flex-direction: column;
  gap: 12px;
}

.petty-items__row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.petty-items__material {
  flex: 1;
  min-width: 240px;
}

.petty-items__meta {
  color: rgba(0, 0, 0, 0.45);
  font-size: 12px;
}

.petty-items__subtotal {
  min-width: 120px;
  text-align: right;
}

.petty-items__total {
  text-align: right;
  font-weight: 600;
  font-size: 16px;
}
</style>
