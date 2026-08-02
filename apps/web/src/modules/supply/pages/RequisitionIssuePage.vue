<script setup lang="ts">
import { ArrowLeftOutlined, ExportOutlined } from '@ant-design/icons-vue';
import type { WorkflowOverview } from '@oa/contracts';
import { message } from 'ant-design-vue';
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import DocumentFormLayout from '../../../shared/components/DocumentFormLayout.vue';
import FormSection from '../../../shared/components/FormSection.vue';
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
const contactName = computed(() => {
  const id = response.value?.data.contactUserId;
  return directory.users.find((user) => user.id === id)?.displayName ?? id ?? '-';
});

onMounted(() => {
  void initialize();
});

async function initialize(): Promise<void> {
  loading.value = true;
  pageError.value = '';
  try {
    await Promise.all([session.ensureSession(), directory.load()]);
    const [requisition, documentOverview, items] = await Promise.all([
      supplyApi.getRequisition(documentId.value),
      workflow.loadOverview(documentId.value),
      supplyApi.listItems(),
    ]);
    response.value = requisition;
    overview.value = documentOverview;
    inventory.value = items;
    issueLines.value =
      requisition.data.issueStatus === 'NOT_ISSUED'
        ? createIssueLines(requisition.data)
        : requisition.data.items.map((item) => ({
            materialItemId: item.materialItemId,
            issuedQuantity: Number(item.issuedQuantity ?? 0),
            issuedAt: toLocalDateTime(requisition.data.issuedAt),
          }));
  } catch (error) {
    pageError.value = errorMessage(error);
  } finally {
    loading.value = false;
  }
}

async function submitIssue(): Promise<void> {
  if (!response.value || !canIssue.value) {
    return;
  }
  const validation = validateIssue(issueLines.value, response.value.data, inventory.value);
  errors.value = validation;
  pageError.value = '';
  if (Object.keys(validation).length > 0) {
    pageError.value = '实发信息未填写完整或超过业务限制，请检查明细提示。';
    return;
  }

  const issuedAt = issueLines.value[0]?.issuedAt;
  if (!issuedAt) {
    return;
  }
  submitting.value = true;
  try {
    const result = await supplyApi.issue(documentId.value, {
      issuedAt: new Date(issuedAt).toISOString(),
      items: issueLines.value.map((line) => ({
        materialItemId: line.materialItemId,
        issuedQuantity: String(line.issuedQuantity),
      })),
    });
    response.value = result;
    inventory.value = await supplyApi.listItems();
    issueLines.value = result.data.items.map((item) => ({
      materialItemId: item.materialItemId,
      issuedQuantity: Number(item.issuedQuantity ?? 0),
      issuedAt: toLocalDateTime(result.data.issuedAt),
    }));
    message.success('实发登记已完成，库存台账已同步扣减');
  } catch (error) {
    pageError.value = errorMessage(error);
  } finally {
    submitting.value = false;
  }
}

function toLocalDateTime(value: string | null): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '实发登记加载失败';
}
</script>

<template>
  <a-spin :spinning="loading">
    <a-result
      v-if="!loading && !hasIssuePermission"
      status="403"
      sub-title="只有仓库管理员可以查看和登记物资实发信息。"
      title="无实发登记权限"
    >
      <template #extra>
        <a-button type="primary" @click="router.push({ name: supplyRouteNames.overview })">
          返回物资台账
        </a-button>
      </template>
    </a-result>

    <a-result
      v-else-if="!loading && overview && !isApproved"
      status="warning"
      sub-title="领用申请必须完成全部审批节点后，仓库才能登记出库。"
      title="单据尚未审批通过"
    >
      <template #extra>
        <a-button
          @click="
            router.push({ name: supplyRouteNames.requisitionEdit, params: { id: documentId } })
          "
        >
          查看领用单
        </a-button>
      </template>
    </a-result>

    <DocumentFormLayout
      v-else-if="response && overview"
      class="supply-document"
      description="核对审批结果和库存后逐项登记实际发放数量。"
      :document-number="response.data.number"
      :loading="loading"
      :revision="overview.document.revision"
      :status="overview.document.status"
      title="物资实发登记"
    >
      <template #headerActions>
        <a-button
          @click="
            router.push({ name: supplyRouteNames.requisitionEdit, params: { id: documentId } })
          "
        >
          <template #icon><ArrowLeftOutlined /></template>
          返回领用单
        </a-button>
      </template>

      <a-alert v-if="pageError" class="page-alert" :message="pageError" show-icon type="error" />
      <a-alert
        v-if="isNotIssued"
        class="page-alert"
        message="当前后端仅支持一次性整单实发登记。允许本次少发并记录为“部分发放”，但登记后单据会锁定，暂不支持后续分批补发；因此各行实发时间必须一致。"
        show-icon
        type="warning"
      />
      <a-alert
        v-else
        class="page-alert"
        :message="`该单已完成实发登记：${response.data.issueStatus}`"
        :description="`登记时间：${formatDateTime(response.data.issuedAt)}`"
        show-icon
        type="success"
      />

      <FormSection
        title="领用单信息"
        description="以下信息来自已审批单据，实发登记不能修改申请内容。"
      >
        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item label="领用单号">{{ response.data.number }}</a-descriptions-item>
          <a-descriptions-item label="填写日期">{{
            response.data.applicationDate
          }}</a-descriptions-item>
          <a-descriptions-item label="联系人">{{ contactName }}</a-descriptions-item>
          <a-descriptions-item label="发放状态">{{
            response.data.issueStatus
          }}</a-descriptions-item>
        </a-descriptions>
      </FormSection>

      <FormSection
        title="实发明细"
        description="实发数量不得超过请领数量和当前可用库存；未发项目请填写 0。"
      >
        <IssueItemsEditor
          v-model="issueLines"
          :disabled="!canIssue"
          :errors="errors"
          :inventory="inventory"
          :requisition="response.data"
        />
      </FormSection>

      <template #aside>
        <WorkflowSidebar :loading="loading" :overview="overview" />
      </template>

      <template #actions>
        <a-space wrap>
          <a-button
            @click="
              router.push({ name: supplyRouteNames.requisitionEdit, params: { id: documentId } })
            "
          >
            返回领用单
          </a-button>
          <a-popconfirm
            v-if="canIssue"
            description="提交后立即扣减库存，当前接口不支持撤销或再次分批登记。"
            ok-text="确认实发"
            title="确认提交本次实发登记？"
            @confirm="submitIssue"
          >
            <a-button :loading="submitting" type="primary">
              <template #icon><ExportOutlined /></template>
              提交实发登记
            </a-button>
          </a-popconfirm>
        </a-space>
      </template>
    </DocumentFormLayout>

    <a-result
      v-else-if="!loading"
      status="error"
      :sub-title="pageError || '无法读取领用单或审批信息。'"
      title="实发页面加载失败"
    />
  </a-spin>
</template>

<style scoped>
.page-alert {
  margin-bottom: 16px;
}

.supply-document :deep(.form-section) {
  background: #fff;
  border-bottom: 1px solid #e5e9f0;
  padding: 22px 0;
}

.supply-document :deep(.form-section:first-child) {
  padding-top: 0;
}

@media (max-width: 767px) {
  .supply-document :deep(.ant-descriptions-view) {
    overflow-x: auto;
  }
}
</style>
