<script setup lang="ts">
import { ElMessage } from 'element-plus';
import type { WorkflowOverview } from '@oa/contracts';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AppPageHeader from '../../../shared/components/AppPageHeader.vue';
import DocumentFormLayout from '../../../shared/components/DocumentFormLayout.vue';
import FormSection from '../../../shared/components/FormSection.vue';
import KeyValueSummary from '../../../shared/components/KeyValueSummary.vue';
import WorkflowSidebar from '../../../shared/components/WorkflowSidebar.vue';
import { useDirectoryStore } from '../../../shared/directory';
import { formatDateTime } from '../../../shared/format';
import { useSessionStore } from '../../../shared/session';
import { useWorkflowStore } from '../../../shared/workflow';
import IssueItemsEditor from '../components/IssueItemsEditor.vue';
import { createIssueLines, validateIssue } from '../domain/supply-form';
import { supplyRouteNames } from '../route-names';
import { supplyApi } from '../supply-api';
import type { FieldErrors, IssueLineForm, MaterialItem, RequisitionEnvelope } from '../types';

const route = useRoute();
const router = useRouter();
const session = useSessionStore();
const directory = useDirectoryStore();
const workflow = useWorkflowStore();
const documentId = computed(() => String(route.params.id));
const response = ref<RequisitionEnvelope | null>(null);
const overview = ref<WorkflowOverview | null>(null);
const inventory = ref<MaterialItem[]>([]);
const issueLines = ref<IssueLineForm[]>([]);
const errors = ref<FieldErrors>({});
const loading = ref(false);
const submitting = ref(false);
const pageError = ref('');
const hasIssuePermission = computed(() => session.can('SUPPLY_ISSUE'));
const isApproved = computed(() => overview.value?.document.status === 'APPROVED');
const isNotIssued = computed(() => response.value?.data.issueStatus === 'NOT_ISSUED');
const canIssue = computed(() => hasIssuePermission.value && isApproved.value && isNotIssued.value);
const contactName = computed(() => directory.users.find((user) => user.id === response.value?.data.contactUserId)?.displayName ?? response.value?.data.contactUserId ?? '-');
const issueStatusLabel = computed(() => ({ NOT_ISSUED: '待发放', PARTIALLY_ISSUED: '部分发放（已锁单）', ISSUED: '已发放' })[response.value?.data.issueStatus as 'NOT_ISSUED' | 'PARTIALLY_ISSUED' | 'ISSUED'] ?? response.value?.data.issueStatus ?? '-');

onMounted(() => { void initialize(); });
async function initialize(): Promise<void> {
  loading.value = true;
  pageError.value = '';
  try {
    await Promise.all([session.ensureSession(), directory.load()]);
    if (!hasIssuePermission.value) return;
    const [requisition, documentOverview, items] = await Promise.all([supplyApi.getRequisition(documentId.value), workflow.loadOverview(documentId.value), supplyApi.listItems()]);
    response.value = requisition;
    overview.value = documentOverview;
    inventory.value = items;
    issueLines.value = requisition.data.issueStatus === 'NOT_ISSUED' ? createIssueLines(requisition.data) : requisition.data.items.map((item) => ({ materialItemId: item.materialItemId, issuedQuantity: Number(item.issuedQuantity ?? 0), issuedAt: toLocalDateTime(requisition.data.issuedAt) }));
  } catch (error) { pageError.value = errorMessage(error); }
  finally { loading.value = false; }
}
async function submitIssue(): Promise<void> {
  if (!response.value || !canIssue.value || submitting.value) return;
  errors.value = validateIssue(issueLines.value, response.value.data, inventory.value);
  pageError.value = '';
  if (Object.keys(errors.value).length > 0) { pageError.value = '实发信息未填写完整或超过业务限制，请检查明细提示。'; return; }
  const issuedAt = issueLines.value[0]?.issuedAt;
  if (!issuedAt) return;
  submitting.value = true;
  try {
    const result = await supplyApi.issue(documentId.value, { issuedAt: new Date(issuedAt).toISOString(), items: issueLines.value.map((line) => ({ materialItemId: line.materialItemId, issuedQuantity: String(line.issuedQuantity) })) });
    response.value = result;
    inventory.value = await supplyApi.listItems();
    issueLines.value = result.data.items.map((item) => ({ materialItemId: item.materialItemId, issuedQuantity: Number(item.issuedQuantity ?? 0), issuedAt: toLocalDateTime(result.data.issuedAt) }));
    ElMessage.success('实发登记已完成，库存台账已同步扣减');
  } catch (error) { pageError.value = errorMessage(error); }
  finally { submitting.value = false; }
}
function toLocalDateTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : '实发登记加载失败'; }
</script>

<template>
  <div class="ui-page">
    <AppPageHeader title="物资领用发放" eyebrow="物资管理" description="核对实发数量并登记出库" />
    <el-result v-if="!loading && !hasIssuePermission" icon="error" title="无实发登记权限" sub-title="只有仓库管理员可以查看和登记物资实发信息。"><template #extra><el-button type="primary" @click="router.push({ name: supplyRouteNames.overview })">返回物资台账</el-button></template></el-result>
    <el-result v-else-if="!loading && overview && !isApproved" icon="warning" title="单据尚未审批通过" sub-title="领用申请必须完成审批后，仓库才能登记出库。"><template #extra><el-button @click="router.push({ name: supplyRouteNames.requisitionEdit, params: { id: documentId } })">查看领用单</el-button></template></el-result>
    <DocumentFormLayout v-else-if="response && overview" title="物资实发登记" description="核对已审批单据与库存，逐项登记实际发放。" :document-number="response.data.number" :loading="loading" :revision="overview.document.revision" :status="overview.document.status">
      <template #headerActions><el-button @click="router.push({ name: supplyRouteNames.requisitionEdit, params: { id: documentId } })">返回领用单</el-button></template>
      <el-alert v-if="pageError" :title="pageError" type="error" show-icon :closable="false" />
      <el-alert v-if="isNotIssued" title="仅支持一次性整单登记" description="允许少发并记录为部分发放，但登记后单据锁定，暂不支持补发；各行实发时间必须一致。" type="warning" show-icon :closable="false" />
      <el-alert v-else :title="`实发状态：${issueStatusLabel}`" :description="`登记时间：${formatDateTime(response.data.issuedAt)}`" type="success" show-icon :closable="false" />
      <FormSection title="领用单信息"><KeyValueSummary :items="[{ label: '领用单号', value: response.data.number }, { label: '填写日期', value: response.data.applicationDate }, { label: '联系人', value: contactName }, { label: '发放状态', value: issueStatusLabel }]" /></FormSection>
      <FormSection title="实发明细" description="实发数量不得超过请领数量或当前库存；未发项目填写 0。"><IssueItemsEditor v-model="issueLines" :disabled="!canIssue || submitting" :errors="errors" :inventory="inventory" :requisition="response.data" /></FormSection>
      <template #aside><WorkflowSidebar :loading="loading" :overview="overview" /></template>
      <template #actions><div class="ui-actions"><el-button @click="router.push({ name: supplyRouteNames.requisitionEdit, params: { id: documentId } })">返回领用单</el-button><el-popconfirm v-if="canIssue" title="确认提交？库存立即扣减，不能撤销或再次补发。" confirm-button-text="确认实发" cancel-button-text="取消" :width="300" @confirm="submitIssue"><template #reference><el-button :loading="submitting" type="primary">提交实发登记</el-button></template></el-popconfirm></div></template>
    </DocumentFormLayout>
    <el-result v-else-if="!loading" icon="error" title="实发页面加载失败" :sub-title="pageError || '无法读取领用单或审批信息。'" />
    <el-skeleton v-else :rows="8" animated />
  </div>
</template>
