<script setup lang="ts">
import { ArrowLeftOutlined, CheckOutlined, SaveOutlined } from '@ant-design/icons-vue';
import { message } from 'ant-design-vue';
import type { WorkflowOverview } from '@oa/contracts';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import DocumentFormLayout from '../../../shared/components/DocumentFormLayout.vue';
import FormSection from '../../../shared/components/FormSection.vue';
import WorkflowSidebar from '../../../shared/components/WorkflowSidebar.vue';
import { useDirectoryStore } from '../../../shared/directory';
import { formatMoney, todayIso } from '../../../shared/format';
import { useSessionStore } from '../../../shared/session';
import { useWorkflowStore } from '../../../shared/workflow';
import {
  createPurchaseLine,
  hydratePurchaseLines,
  purchaseTotals,
  toPurchasePayload,
  validatePurchase,
} from '../domain/supply-form';
import { supplyRouteNames } from '../route-names';
import { supplyApi } from '../supply-api';
import type { FieldErrors, PurchaseEnvelope, PurchaseLineForm } from '../types';
import PurchaseItemsEditor from './PurchaseItemsEditor.vue';

const props = defineProps<{ documentId?: string }>();

const router = useRouter();
const session = useSessionStore();
const directory = useDirectoryStore();
const workflow = useWorkflowStore();

const currentId = ref<string | null>(props.documentId ?? null);
const response = ref<PurchaseEnvelope | null>(null);
const overview = ref<WorkflowOverview | null>(null);
const loading = ref(false);
const saving = ref(false);
const submitting = ref(false);
const pageError = ref('');
const errors = ref<FieldErrors>({});
const form = reactive<{ applicationDate: string; items: PurchaseLineForm[] }>({
  applicationDate: todayIso(),
  items: [createPurchaseLine()],
});

const status = computed(() => overview.value?.document.status ?? response.value?.document.status);
const revision = computed(
  () => overview.value?.document.revision ?? response.value?.document.revision,
);
const editable = computed(
  () => !currentId.value || status.value === 'DRAFT' || status.value === 'RETURNED',
);
const totals = computed(() => purchaseTotals(form.items));
const applicantName = computed(() => {
  const applicantId = response.value?.data.applicantId;
  return (
    directory.users.find((user) => user.id === applicantId)?.displayName ??
    session.user?.displayName ??
    '-'
  );
});
const departmentName = computed(() => {
  const departmentId = response.value?.data.departmentId;
  return (
    directory.departments.find((department) => department.id === departmentId)?.name ??
    session.user?.departmentName ??
    '-'
  );
});

onMounted(() => {
  void initialize();
});

async function initialize(): Promise<void> {
  loading.value = true;
  pageError.value = '';
  try {
    await Promise.all([session.ensureSession(), directory.load()]);
    if (!currentId.value) {
      return;
    }
    const [purchase, documentOverview] = await Promise.all([
      supplyApi.getPurchase(currentId.value),
      workflow.loadOverview(currentId.value),
    ]);
    response.value = purchase;
    overview.value = documentOverview;
    form.applicationDate = purchase.data.applicationDate;
    form.items = hydratePurchaseLines(purchase.data);
  } catch (error) {
    pageError.value = errorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function saveDraft(): Promise<void> {
  await persist(false);
}

async function submitDocument(): Promise<void> {
  await persist(true);
}

async function persist(submitAfterSave: boolean): Promise<void> {
  const validation = validatePurchase(form.applicationDate, form.items);
  errors.value = validation;
  pageError.value = '';
  if (Object.keys(validation).length > 0) {
    pageError.value = '表单存在未完成或不符合规则的字段，请检查红色提示。';
    return;
  }

  const wasNew = currentId.value === null;
  const state = submitAfterSave ? submitting : saving;
  state.value = true;
  try {
    const saved = await supplyApi.savePurchase(
      currentId.value,
      toPurchasePayload(form.applicationDate, form.items),
    );
    currentId.value = saved.data.id;
    response.value = saved;
    if (submitAfterSave) {
      await supplyApi.submit(saved.data.id);
    }
    overview.value = await workflow.loadOverview(saved.data.id);
    await workflow.refresh();
    message.success(submitAfterSave ? '申购单已提交审批' : '申购草稿已保存');
    if (wasNew) {
      await router.replace({
        name: supplyRouteNames.purchaseEdit,
        params: { id: saved.data.id },
      });
    }
  } catch (error) {
    pageError.value = errorMessage(error);
  } finally {
    state.value = false;
  }
}

function updateApplicationDate(value: string): void {
  form.applicationDate = value;
  delete errors.value.applicationDate;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '操作失败，请稍后重试';
}
</script>

<template>
  <DocumentFormLayout
    class="supply-document"
    description="按原始申购依据逐项填写，金额由系统实时计算并随单据进入审批。"
    :document-number="response?.data.number"
    :loading="loading"
    :revision="revision"
    :status="status"
    title="物资申购单"
  >
    <template #headerActions>
      <a-button @click="router.push({ name: supplyRouteNames.overview })">
        <template #icon><ArrowLeftOutlined /></template>
        返回台账
      </a-button>
    </template>

    <a-alert v-if="pageError" class="page-alert" :message="pageError" show-icon type="error" />
    <a-alert
      v-if="currentId && !editable"
      class="page-alert"
      message="单据已进入审批或归档状态，当前仅可查看。"
      show-icon
      type="info"
    />

    <FormSection title="申请信息" description="申请人和部门取自当前登录会话，不允许手工覆盖。">
      <div class="header-field-grid">
        <a-form-item label="申购人">
          <a-input :value="applicantName" disabled />
        </a-form-item>
        <a-form-item label="申购部门">
          <a-input :value="departmentName" disabled />
        </a-form-item>
        <a-form-item
          label="申购日期"
          required
          :help="errors.applicationDate"
          :validate-status="errors.applicationDate ? 'error' : undefined"
        >
          <a-input
            :disabled="!editable"
            :value="form.applicationDate"
            type="date"
            @update:value="updateApplicationDate"
          />
        </a-form-item>
      </div>
    </FormSection>

    <FormSection
      title="申购明细"
      description="数量支持两位小数；参考单价保留两位金额精度，至少填写一项。"
    >
      <PurchaseItemsEditor v-model="form.items" :disabled="!editable" :errors="errors" />
    </FormSection>

    <FormSection
      title="含税金额汇总"
      description="汇总仅基于当前申购参考价，不覆盖后续采购执行价。"
    >
      <div class="totals-strip">
        <div>
          <span>申购部门含税单价合计</span>
          <strong>{{ formatMoney(totals.unitPriceTotalCents) }}</strong>
        </div>
        <div>
          <span>申购部门含税金额合计</span>
          <strong>{{ formatMoney(totals.amountTotalCents) }}</strong>
        </div>
        <div>
          <span>明细项数</span>
          <strong>{{ form.items.length }} 项</strong>
        </div>
      </div>
    </FormSection>

    <template #aside>
      <WorkflowSidebar :loading="loading" :overview="overview" />
    </template>

    <template #actions>
      <a-space wrap>
        <a-button @click="router.push({ name: supplyRouteNames.overview })">取消</a-button>
        <a-button :disabled="!editable" :loading="saving" @click="saveDraft">
          <template #icon><SaveOutlined /></template>
          保存草稿
        </a-button>
        <a-popconfirm
          description="提交后将进入审批流程，审批中不能修改。"
          ok-text="确认提交"
          title="提交物资申购单？"
          @confirm="submitDocument"
        >
          <a-button :disabled="!editable" :loading="submitting" type="primary">
            <template #icon><CheckOutlined /></template>
            提交审批
          </a-button>
        </a-popconfirm>
      </a-space>
    </template>
  </DocumentFormLayout>
</template>

<style scoped>
.page-alert {
  margin-bottom: 16px;
}

.header-field-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.totals-strip {
  background: var(--color-fill-subtle);
  border-left: 3px solid var(--color-primary);
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  padding: 18px 20px;
}

.totals-strip div {
  display: grid;
  gap: 6px;
}

.totals-strip span {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.totals-strip strong {
  color: var(--color-text);
  font-size: 20px;
}

.supply-document :deep(.form-section) {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 22px 0;
}

.supply-document :deep(.form-section:first-child) {
  padding-top: 0;
}

@media (max-width: 767px) {
  .header-field-grid,
  .totals-strip {
    grid-template-columns: 1fr;
  }

  .totals-strip {
    gap: 12px;
  }
}
</style>
