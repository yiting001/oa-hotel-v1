<script setup lang="ts">
import { ElMessage } from 'element-plus';
import type { WorkflowOverview } from '@oa/contracts';
import { requiredBusinessModulePermissions } from '@oa/contracts';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import AttachmentField from '../../../shared/components/AttachmentField.vue';
import DocumentFormLayout from '../../../shared/components/DocumentFormLayout.vue';
import FormSection from '../../../shared/components/FormSection.vue';
import KeyValueSummary from '../../../shared/components/KeyValueSummary.vue';
import WorkflowSidebar from '../../../shared/components/WorkflowSidebar.vue';
import { useDirectoryStore } from '../../../shared/directory';
import { todayIso } from '../../../shared/format';
import { useSessionStore } from '../../../shared/session';
import { useWorkflowStore } from '../../../shared/workflow';
import { createRequisitionLine, hydrateRequisitionLines, toRequisitionPayload, validateRequisition } from '../domain/supply-form';
import { supplyRouteNames } from '../route-names';
import { supplyApi } from '../supply-api';
import type { FieldErrors, MaterialItem, RequisitionEnvelope, RequisitionLineForm } from '../types';
import RequisitionItemsEditor from './RequisitionItemsEditor.vue';

const props = defineProps<{ documentId?: string }>();
const router = useRouter();
const session = useSessionStore();
const directory = useDirectoryStore();
const workflow = useWorkflowStore();
const currentId = ref<string | null>(props.documentId ?? null);
const response = ref<RequisitionEnvelope | null>(null);
const overview = ref<WorkflowOverview | null>(null);
const materials = ref<MaterialItem[]>([]);
const loading = ref(false);
const saving = ref(false);
const submitting = ref(false);
const pageError = ref('');
const errors = ref<FieldErrors>({});
const form = reactive<{ applicationDate: string; contactUserId: string; items: RequisitionLineForm[]; attachments: string[] }>({ applicationDate: todayIso(), contactUserId: '', items: [createRequisitionLine()], attachments: [] });
const status = computed(() => overview.value?.document.status ?? response.value?.document.status);
const revision = computed(() => overview.value?.document.revision ?? response.value?.document.revision);
const canCreate = computed(() => requiredBusinessModulePermissions('SUPPLY', 'CREATE').every((code) => session.can(code)));
const editable = computed(() => !loading.value && canCreate.value && (!currentId.value || (response.value?.data.applicantId === session.user?.id && ['DRAFT', 'RETURNED'].includes(status.value ?? ''))));
const busy = computed(() => saving.value || submitting.value);
const canIssue = computed(() => Boolean(currentId.value) && status.value === 'APPROVED' && response.value?.data.issueStatus === 'NOT_ISSUED' && session.can('SUPPLY_ISSUE'));
const applicantName = computed(() => directory.users.find((user) => user.id === response.value?.data.applicantId)?.displayName ?? session.user?.displayName ?? '-');
const departmentName = computed(() => directory.departments.find((department) => department.id === response.value?.data.departmentId)?.name ?? session.user?.departmentName ?? '-');
const issueStatusLabel = computed(() => ({ NOT_ISSUED: '待发放', PARTIALLY_ISSUED: '部分发放（已锁单）', ISSUED: '已发放' })[response.value?.data.issueStatus as 'NOT_ISSUED' | 'PARTIALLY_ISSUED' | 'ISSUED'] ?? response.value?.data.issueStatus ?? '尚未生成');

onMounted(() => { void initialize(); });
async function initialize(): Promise<void> {
  loading.value = true;
  pageError.value = '';
  try {
    await Promise.all([session.ensureSession(), directory.load()]);
    form.contactUserId ||= session.user?.id ?? '';
    if (!currentId.value) { materials.value = await supplyApi.listItems(); return; }
    const [inventory, requisition, documentOverview] = await Promise.all([supplyApi.listItems(), supplyApi.getRequisition(currentId.value), workflow.loadOverview(currentId.value)]);
    materials.value = inventory;
    response.value = requisition;
    overview.value = documentOverview;
    form.applicationDate = requisition.data.applicationDate;
    form.contactUserId = requisition.data.contactUserId;
    form.items = hydrateRequisitionLines(requisition.data);
    form.attachments = [...requisition.data.attachments];
  } catch (error) { pageError.value = errorMessage(error); }
  finally { loading.value = false; }
}
async function persist(submitAfterSave: boolean): Promise<void> {
  if (!editable.value || busy.value) return;
  errors.value = validateRequisition(form.applicationDate, form.contactUserId, form.items);
  pageError.value = '';
  if (Object.keys(errors.value).length > 0) { pageError.value = '请检查表单中的必填项与明细提示。'; return; }
  const wasNew = currentId.value === null;
  const state = submitAfterSave ? submitting : saving;
  state.value = true;
  try {
    const saved = await supplyApi.saveRequisition(currentId.value, toRequisitionPayload(form.applicationDate, form.contactUserId, form.items, form.attachments));
    currentId.value = saved.data.id;
    response.value = saved;
    if (submitAfterSave) await supplyApi.submit(saved.data.id);
    overview.value = await workflow.loadOverview(saved.data.id);
    await workflow.refresh();
    ElMessage.success(submitAfterSave ? '领用单已提交审批' : '领用草稿已保存');
    if (wasNew) await router.replace({ name: supplyRouteNames.requisitionEdit, params: { id: saved.data.id } });
  } catch (error) { pageError.value = errorMessage(error); }
  finally { state.value = false; }
}
function openIssue(): void {
  if (currentId.value && canIssue.value) void router.push({ name: supplyRouteNames.requisitionIssue, params: { id: currentId.value } });
}
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : '操作失败，请稍后重试'; }
</script>

<template>
  <DocumentFormLayout title="物品领用申请单" eyebrow="物资管理" description="选择库存物资并登记请领用途，审批通过后由仓库登记实发。" :document-number="response?.data.number" :loading="loading" :revision="revision" :status="status">
    <template #headerActions><div class="ui-actions"><el-button @click="router.push({ name: supplyRouteNames.overview })">返回物资台账</el-button><el-button v-if="canIssue" type="primary" @click="openIssue">登记实发</el-button></div></template>
    <el-alert v-if="pageError" :title="pageError" show-icon type="error" :closable="false" />
    <el-alert v-if="currentId && !editable && !loading" title="申请内容只读" description="审批通过不代表物资已出库，实际发放需单独登记。" show-icon type="info" :closable="false" />
    <FormSection title="申请信息">
      <KeyValueSummary :items="[{ label: '申请人', value: applicantName }, { label: '部门', value: departmentName }, { label: '发放状态', value: issueStatusLabel }]" />
      <el-form class="details-form" label-position="top" :disabled="!editable || busy">
        <div class="ui-fields">
          <el-form-item label="填写日期" required :error="errors.applicationDate"><el-date-picker v-model="form.applicationDate" type="date" value-format="YYYY-MM-DD" placeholder="选择填写日期" /></el-form-item>
          <el-form-item label="联系人" required :error="errors.contactUserId"><el-select v-model="form.contactUserId" filterable placeholder="选择联系人" :loading="directory.loading"><el-option v-for="user in directory.users" :key="user.id" :label="`${user.displayName} · ${user.departmentName}`" :value="user.id" /></el-select></el-form-item>
        </div>
      </el-form>
    </FormSection>
    <FormSection title="领用明细" description="货物编号、品名、规格和单位取自库存目录，不能手工更改。"><RequisitionItemsEditor v-model="form.items" :disabled="!editable || busy" :errors="errors" :materials="materials" /></FormSection>
    <FormSection title="相关附件"><AttachmentField v-if="editable" v-model="form.attachments" /><el-empty v-else-if="form.attachments.length === 0" description="无附件" :image-size="60" /><div v-else class="attachment-list"><el-tag v-for="(attachment, index) in form.attachments" :key="`${attachment}-${index}`" type="info">{{ attachment }}</el-tag></div></FormSection>
    <template #aside><WorkflowSidebar :loading="loading" :overview="overview" /></template>
    <template #actions><div class="ui-actions form-actions"><el-button @click="router.push({ name: supplyRouteNames.overview })">返回</el-button><el-button :disabled="!editable || busy" :loading="saving" @click="persist(false)">保存草稿</el-button><el-popconfirm title="提交后进入审批，审批中不能修改。确认提交？" confirm-button-text="确认提交" cancel-button-text="取消" :width="280" @confirm="persist(true)"><template #reference><el-button :disabled="!editable || busy" :loading="submitting" type="primary">提交审批</el-button></template></el-popconfirm></div></template>
  </DocumentFormLayout>
</template>

<style scoped>
.details-form { margin-top: 24px; }
:deep(.el-date-editor.el-input), :deep(.el-select) { width: 100%; }
.attachment-list, .form-actions { display: flex; flex-wrap: wrap; gap: 8px; }
</style>
