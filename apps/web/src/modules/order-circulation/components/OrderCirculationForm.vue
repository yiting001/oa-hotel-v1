<script setup lang="ts">
import type { DirectoryUser } from '@oa/contracts';
import { ElMessage, type FormInstance, type FormRules } from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import { apiRequest } from '../../../shared/api';
import AttachmentUploadField from '../../../shared/components/AttachmentUploadField.vue';
import DocumentFormLayout from '../../../shared/components/DocumentFormLayout.vue';
import FormSection from '../../../shared/components/FormSection.vue';
import WorkflowSidebar from '../../../shared/components/WorkflowSidebar.vue';
import { todayIso } from '../../../shared/format';
import { useSessionStore } from '../../../shared/session';
import { useWorkflowStore } from '../../../shared/workflow';
import { useLayoutMode } from '../../../ui/useLayoutMode';
import ContractDocumentActions from '../../contract/components/ContractDocumentActions.vue';
import type { EditorMode } from '../../contract/contract.types';
import {
  useContractDocumentEditor,
  validateDocumentForm,
} from '../../contract/useContractDocumentEditor';
import { copyWorkflowDocument } from '../../workbench/api/workbench-api';
import {
  ORDER_CIRCULATION_API,
  ORDER_CIRCULATION_ROUTE_NAMES,
} from '../order-circulation.config';
import type {
  OrderCirculationData,
  OrderCirculationPayload,
} from '../order-circulation.types';

const props = defineProps<{ mode: EditorMode; documentId?: string }>();
const formRef = ref<FormInstance>();
const session = useSessionStore();
const workflow = useWorkflowStore();
const { isCompact } = useLayoutMode();

const form = reactive<OrderCirculationPayload>({
  applicationDate: todayIso(),
  subject: '',
  content: '',
  ccUserIds: [],
  attachments: [],
});

const recipientOptions = ref<DirectoryUser[]>([]);
const fallbackRecipients = ref<DirectoryUser[]>([]);

const selectableRecipients = computed(() => {
  const known = new Set(recipientOptions.value.map((recipient) => recipient.id));
  return [
    ...recipientOptions.value,
    ...fallbackRecipients.value.filter((recipient) => !known.has(recipient.id)),
  ];
});

const rules: FormRules<OrderCirculationPayload> = {
  applicationDate: [{ required: true, message: '请选择申请日期' }],
  subject: [
    { required: true, whitespace: true, message: '请输入主题' },
    { max: 200, message: '主题不能超过 200 个字' },
  ],
  content: [
    { required: true, whitespace: true, message: '请输入主要内容' },
    { max: 5000, message: '主要内容不能超过 5000 个字' },
  ],
};

async function loadRecipients(): Promise<void> {
  try {
    recipientOptions.value = await apiRequest<DirectoryUser[]>(ORDER_CIRCULATION_API.ccRecipients);
  } catch (error) {
    ElMessage.warning(error instanceof Error ? error.message : '可抄送人员加载失败');
  }
}

const editor = useContractDocumentEditor<OrderCirculationData, OrderCirculationPayload>({
  mode: props.mode,
  documentId: props.documentId,
  documentType: 'ORDER_CIRCULATION',
  createPath: ORDER_CIRCULATION_API.orders,
  itemPath: ORDER_CIRCULATION_API.order,
  editRouteName: ORDER_CIRCULATION_ROUTE_NAMES.edit,
  listRouteName: ORDER_CIRCULATION_ROUTE_NAMES.list,
  validate: async () => {
    await validateDocumentForm(formRef.value);
  },
  payload: () => ({
    applicationDate: form.applicationDate,
    subject: form.subject.trim(),
    content: form.content.trim(),
    ccUserIds: [...form.ccUserIds],
    attachments: [...form.attachments],
  }),
  assign: (data) => {
    form.applicationDate = data.applicationDate || todayIso();
    form.subject = data.subject ?? '';
    form.content = data.content ?? '';
    form.ccUserIds = (data.ccRecipients ?? []).map((recipient) => recipient.id);
    form.attachments = [...data.attachments];
    // 历史上保存过、但已不在可抄送范围内的接收人仍要显示姓名
    fallbackRecipients.value = (data.ccRecipients ?? []).map((recipient) => ({
      id: recipient.id,
      username: recipient.id,
      displayName: recipient.name,
      departmentId: '',
      departmentName: '',
    }));
  },
  afterSubmit: async (id) => {
    if (form.ccUserIds.length === 0) return;
    try {
      await copyWorkflowDocument(id, form.ccUserIds);
    } catch (error) {
      // 单据已经提交成功，抄送失败只提示，不回滚审批
      ElMessage.warning(
        error instanceof Error ? `单据已提交，但抄送失败：${error.message}` : '单据已提交，但抄送失败',
      );
    }
  },
});

onMounted(() => {
  void editor.initialize([session.ensureSession(), workflow.refresh(), loadRecipients()]);
});
</script>

<template>
  <div class="contract-document-form">
    <DocumentFormLayout
      :description="
        props.mode === 'create' ? '填写单子主要内容并选择抄送人' : '编辑订单流转单'
      "
      :document-number="editor.documentNumber.value"
      :loading="editor.loading.value"
      :revision="editor.revision.value"
      :status="editor.status.value"
      eyebrow="订单流转"
      :title="props.mode === 'create' ? '新建订单流转' : '订单流转'"
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
        <FormSection title="流转信息">
          <div class="ui-fields" :class="{ 'is-compact': isCompact }">
            <el-form-item label="单据编号">
              <div class="contract-readonly-value">
                {{ editor.documentNumber.value ?? '保存后自动生成' }}
              </div>
            </el-form-item>
            <el-form-item label="申请部门">
              <div class="contract-readonly-value">{{ session.user?.departmentName ?? '-' }}</div>
            </el-form-item>
            <el-form-item label="发起人">
              <div class="contract-readonly-value">{{ session.user?.displayName ?? '-' }}</div>
            </el-form-item>
            <el-form-item label="申请日期" prop="applicationDate">
              <el-date-picker
                v-model="form.applicationDate"
                format="YYYY-MM-DD"
                placeholder="请选择申请日期"
                type="date"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
          </div>
        </FormSection>

        <FormSection
          title="单子内容"
          description="填写单子主要内容即可，具体内容请放在附件中。"
        >
          <el-form-item label="主题" prop="subject">
            <el-input
              v-model="form.subject"
              :maxlength="200"
              placeholder="请输入主题"
              show-word-limit
            />
          </el-form-item>
          <el-form-item label="主要内容" prop="content">
            <el-input
              v-model="form.content"
              :maxlength="5000"
              placeholder="简要说明单子内容，详细资料见附件"
              :rows="6"
              show-word-limit
              type="textarea"
            />
          </el-form-item>
        </FormSection>

        <FormSection title="抄送安排">
          <el-form-item label="抄送人" prop="ccUserIds">
            <el-select
              v-model="form.ccUserIds"
              aria-label="抄送人"
              clearable
              data-testid="order-cc-select"
              filterable
              multiple
              placeholder="选择抄送人（可多选）"
              style="width: 100%"
            >
              <el-option
                v-for="recipient in selectableRecipients"
                :key="recipient.id"
                :label="
                  recipient.departmentName
                    ? `${recipient.displayName} · ${recipient.departmentName}`
                    : recipient.displayName
                "
                :value="recipient.id"
              />
            </el-select>
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
