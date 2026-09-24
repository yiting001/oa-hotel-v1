<script setup lang="ts">
import { ElMessage } from 'element-plus';
import type { WorkflowOverview } from '@oa/contracts';
import { requiredBusinessModulePermissions } from '@oa/contracts';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import DocumentFormLayout from '../../../shared/components/DocumentFormLayout.vue';
import FormSection from '../../../shared/components/FormSection.vue';
import KeyValueSummary from '../../../shared/components/KeyValueSummary.vue';
import WorkflowSidebar from '../../../shared/components/WorkflowSidebar.vue';
import { useDirectoryStore } from '../../../shared/directory';
import { formatMoney, todayIso } from '../../../shared/format';
import { useSessionStore } from '../../../shared/session';
import { useWorkflowStore } from '../../../shared/workflow';
import { createPurchaseLine, hydratePurchaseLines, purchaseTotals, toPurchasePayload, validatePurchase } from '../domain/supply-form';
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
const form = reactive<{ applicationDate: string; items: PurchaseLineForm[] }>({ applicationDate: todayIso(), items: [createPurchaseLine()] });
const status = computed(() => overview.value?.document.status ?? response.value?.document.status);
const revision = computed(() => overview.value?.document.revision ?? response.value?.document.revision);
const canCreate = computed(() => requiredBusinessModulePermissions('SUPPLY', 'CREATE').every((code) => session.can(code)));
const editable = computed(() => !loading.value && canCreate.value && (!currentId.value || (response.value?.data.applicantId === session.user?.id && ['DRAFT', 'RETURNED'].includes(status.value ?? ''))));
const busy = computed(() => saving.value || submitting.value);
const totals = computed(() => purchaseTotals(form.items));
const applicantName = computed(() => directory.users.find((user) => user.id === response.value?.data.applicantId)?.displayName ?? session.user?.displayName ?? '-');
const departmentName = computed(() => directory.departments.find((department) => department.id === response.value?.data.departmentId)?.name ?? session.user?.departmentName ?? '-');

onMounted(() => { void initialize(); });
async function initialize(): Promise<void> {
  loading.value = true;
  pageError.value = '';
  try {
    await Promise.all([session.ensureSession(), directory.load()]);
    if (!currentId.value) return;
    const [purchase, documentOverview] = await Promise.all([supplyApi.getPurchase(currentId.value), workflow.loadOverview(currentId.value)]);
    response.value = purchase;
    overview.value = documentOverview;
    form.applicationDate = purchase.data.applicationDate;
    form.items = hydratePurchaseLines(purchase.data);
  } catch (error) { pageError.value = errorMessage(error); }
  finally { loading.value = false; }
}
async function persist(submitAfterSave: boolean): Promise<void> {
  if (!editable.value || busy.value) return;
  errors.value = validatePurchase(form.applicationDate, form.items);
  pageError.value = '';
  if (Object.keys(errors.value).length > 0) {
    pageError.value = '请检查表单中的必填项与明细提示。';
    return;
  }
  const wasNew = currentId.value === null;
  const state = submitAfterSave ? submitting : saving;
  state.value = true;
  try {
    const saved = await supplyApi.savePurchase(currentId.value, toPurchasePayload(form.applicationDate, form.items));
    currentId.value = saved.data.id;
    response.value = saved;
    if (submitAfterSave) await supplyApi.submit(saved.data.id);
    overview.value = await workflow.loadOverview(saved.data.id);
    await workflow.refresh();
    ElMessage.success(submitAfterSave ? '申购单已提交审批' : '申购草稿已保存');
    if (wasNew) await router.replace({ name: supplyRouteNames.purchaseEdit, params: { id: saved.data.id } });
  } catch (error) { pageError.value = errorMessage(error); }
  finally { state.value = false; }
}
function updateApplicationDate(value: string | null): void {
  form.applicationDate = value ?? '';
  delete errors.value.applicationDate;
}
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : '操作失败，请稍后重试'; }
</script>

<template>
  <DocumentFormLayout title="物资申购单" eyebrow="物资管理" description="登记申购需求、参考价格与数量，提交部门审批。" :document-number="response?.data.number" :loading="loading" :revision="revision" :status="status">
    <template #headerActions><el-button @click="router.push({ name: supplyRouteNames.overview })">返回物资台账</el-button></template>
    <el-alert v-if="pageError" :title="pageError" show-icon type="error" :closable="false" />
    <el-alert v-if="currentId && !editable && !loading" title="当前单据只读" description="仅申请人可修改草稿或退回单据。" show-icon type="info" :closable="false" />
    <FormSection title="申请信息">
      <KeyValueSummary :items="[{ label: '申购人', value: applicantName }, { label: '申购部门', value: departmentName }]" />
      <el-form class="date-form" label-position="top" :disabled="!editable || busy">
        <div class="ui-fields"><el-form-item label="申购日期" required :error="errors.applicationDate"><el-date-picker :model-value="form.applicationDate" type="date" value-format="YYYY-MM-DD" placeholder="选择申购日期" @update:model-value="updateApplicationDate" /></el-form-item></div>
      </el-form>
    </FormSection>
    <FormSection title="申购明细" description="数量最多两位小数；参考单价以元填写，至少保留一项。">
      <PurchaseItemsEditor v-model="form.items" :disabled="!editable || busy" :errors="errors" />
    </FormSection>
    <FormSection title="申购合计">
      <div class="amount-summary">
        <div><span>含税金额合计</span><strong>{{ formatMoney(totals.amountTotalCents) }}</strong></div>
        <div><span>参考单价合计</span><b>{{ formatMoney(totals.unitPriceTotalCents) }}</b></div>
        <div><span>申购项目</span><b>{{ form.items.length }} 项</b></div>
      </div>
    </FormSection>
    <template #aside><WorkflowSidebar :loading="loading" :overview="overview" /></template>
    <template #actions>
      <div class="ui-actions form-actions">
        <el-button @click="router.push({ name: supplyRouteNames.overview })">返回</el-button>
        <el-button :disabled="!editable || busy" :loading="saving" @click="persist(false)">保存草稿</el-button>
        <el-popconfirm title="提交后进入审批，审批中不能修改。确认提交？" confirm-button-text="确认提交" cancel-button-text="取消" :width="280" @confirm="persist(true)">
          <template #reference><el-button :disabled="!editable || busy" :loading="submitting" type="primary">提交审批</el-button></template>
        </el-popconfirm>
      </div>
    </template>
  </DocumentFormLayout>
</template>

<style scoped>
.date-form { margin-top: 24px; }
:deep(.el-date-editor.el-input) { width: 100%; }
.amount-summary { display: flex; flex-wrap: wrap; gap: 24px 48px; padding: 24px; background: var(--color-surface); border-radius: var(--radius-md); }
.amount-summary > div { display: grid; gap: 8px; min-width: 120px; }
.amount-summary span { color: var(--color-text-secondary); font-size: 13px; }
.amount-summary strong { font-size: 28px; letter-spacing: -0.03em; }
.amount-summary b { font-size: 20px; }
.form-actions { flex-wrap: wrap; }
</style>
