<script setup lang="ts">
import type {
  PortalAdminContentDetail,
  PortalAudienceDirectory,
  PortalContentCategory,
} from '@oa/contracts';
import type { FormInstance, FormRules } from 'element-plus';
import { computed, reactive, ref, watch } from 'vue';
import { businessLocalDateTimeToIso } from '../../../../shared/business-time';
import type { PortalContentWritePayload } from '../../api/portal-admin-api';
import { portalCategoryLabels } from '../../domain/portal';
import {
  createEmptyPortalContentEditorForm,
  createPortalContentEditorForm,
  type PortalContentEditorForm,
} from './portal-content-editor.form';
import PortalRichTextEditor from './PortalRichTextEditor.vue';

const props = defineProps<{
  open: boolean;
  content: PortalAdminContentDetail | null;
  directory: PortalAudienceDirectory | null;
  saving: boolean;
}>();
const emit = defineEmits<{
  close: [];
  save: [payload: PortalContentWritePayload];
}>();

const formRef = ref<FormInstance>();
const form = reactive<PortalContentEditorForm>(createEmptyPortalContentEditorForm());
const rules: FormRules<PortalContentEditorForm> = {
  category: [{ required: true, message: '请选择内容栏目', trigger: 'change' }],
  title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
  summary: [{ required: true, message: '请输入摘要', trigger: 'blur' }],
  body: [{ required: true, message: '请输入正文', trigger: 'blur' }],
  audienceType: [{ required: true, message: '请选择发布受众', trigger: 'change' }],
  audienceIds: [
    {
      validator: (_rule, value: string[], callback) => {
        if (form.audienceType === 'ALL' || value.length > 0) callback();
        else callback(new Error('至少选择一个受众'));
      },
      trigger: 'change',
    },
  ],
};

const categoryOptions = Object.entries(portalCategoryLabels) as Array<
  [PortalContentCategory, string]
>;
const title = computed(() => (props.content ? '编辑内容' : '新建内容'));
const audienceOptions = computed(() => {
  if (!props.directory || form.audienceType === 'ALL') return [];
  if (form.audienceType === 'DEPARTMENT') {
    return props.directory.departments
      .filter((item) => item.active)
      .map((item) => ({ value: item.id, label: item.name }));
  }
  if (form.audienceType === 'ROLE') {
    return props.directory.roles
      .filter((item) => item.active)
      .map((item) => ({ value: item.code, label: item.name }));
  }
  return props.directory.users
    .filter((item) => item.active)
    .map((item) => ({ value: item.id, label: `${item.displayName}（${item.username}）` }));
});

watch(
  () => [props.open, props.content] as const,
  ([open, content]) => {
    if (!open) return;
    Object.assign(
      form,
      content ? createPortalContentEditorForm(content) : createEmptyPortalContentEditorForm(),
    );
    void formRef.value?.clearValidate();
  },
  { immediate: true },
);

async function submit(): Promise<void> {
  if (!(await formRef.value?.validate().catch(() => false))) return;
  emit('save', {
    category: form.category,
    title: form.title.trim(),
    summary: form.summary.trim(),
    body: form.body.trim(),
    audienceType: form.audienceType,
    audienceIds: form.audienceType === 'ALL' ? [] : [...form.audienceIds],
    pinned: form.pinned,
    requiresReceipt: form.requiresReceipt,
    coverImageUrl: form.coverImageUrl.trim() || null,
    attachments: form.attachments.map((item) => item.trim()).filter(Boolean),
    offlineAt: form.offlineAt ? businessLocalDateTimeToIso(form.offlineAt) : null,
  });
}

function changeAudienceType(): void {
  form.audienceIds = [];
  void formRef.value?.clearValidate('audienceIds');
}
</script>

<template>
  <el-drawer
    :model-value="open"
    :title="title"
    class="portal-content-editor"
    data-testid="portal-content-editor"
    size="min(820px, 100%)"
    @close="emit('close')"
  >
    <el-alert
      v-if="content?.status === 'PUBLISHED'"
      :closable="false"
      show-icon
      title="保存后将生成新修订，并立即更新已发布内容"
      type="warning"
    />
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
      <div class="portal-editor-grid">
        <el-form-item label="内容栏目" prop="category">
          <el-select
            v-model="form.category"
            aria-label="内容栏目"
            data-testid="portal-content-category"
          >
            <el-option
              v-for="item in categoryOptions"
              :key="item[0]"
              :label="item[1]"
              :value="item[0]"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="发布受众" prop="audienceType">
          <el-select
            v-model="form.audienceType"
            aria-label="发布受众"
            data-testid="portal-content-audience-type"
            @change="changeAudienceType"
          >
            <el-option label="全员" value="ALL" />
            <el-option label="部门" value="DEPARTMENT" />
            <el-option label="角色" value="ROLE" />
            <el-option label="指定人员" value="USER" />
          </el-select>
        </el-form-item>
      </div>

      <el-form-item v-if="form.audienceType !== 'ALL'" label="受众范围" prop="audienceIds">
        <el-select
          v-model="form.audienceIds"
          aria-label="受众范围"
          collapse-tags
          collapse-tags-tooltip
          data-testid="portal-content-audience-ids"
          filterable
          multiple
        >
          <el-option
            v-for="item in audienceOptions"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="标题" prop="title">
        <el-input
          v-model="form.title"
          aria-label="内容标题"
          data-testid="portal-content-title"
          maxlength="120"
          show-word-limit
        />
      </el-form-item>
      <el-form-item label="摘要" prop="summary">
        <el-input
          v-model="form.summary"
          aria-label="内容摘要"
          data-testid="portal-content-summary"
          maxlength="500"
          :rows="3"
          show-word-limit
          type="textarea"
        />
      </el-form-item>
      <el-form-item label="正文" prop="body">
        <PortalRichTextEditor v-model="form.body" />
      </el-form-item>

      <el-divider />
      <div class="portal-editor-grid">
        <el-form-item label="下线时间">
          <el-date-picker
            v-model="form.offlineAt"
            aria-label="下线时间"
            format="YYYY-MM-DD HH:mm"
            type="datetime"
            value-format="YYYY-MM-DDTHH:mm"
          />
        </el-form-item>
        <el-form-item label="封面图片地址">
          <el-input v-model="form.coverImageUrl" aria-label="封面图片地址" clearable />
        </el-form-item>
      </div>
      <el-form-item label="附件名称">
        <el-select
          v-model="form.attachments"
          allow-create
          aria-label="附件名称"
          default-first-option
          filterable
          multiple
        />
      </el-form-item>
      <div class="portal-editor-switches">
        <el-checkbox v-model="form.pinned">门户置顶</el-checkbox>
        <el-checkbox v-model="form.requiresReceipt">要求阅读回执</el-checkbox>
      </div>
    </el-form>

    <template #footer>
      <el-button @click="emit('close')">取消</el-button>
      <el-button data-testid="portal-content-save" :loading="saving" type="primary" @click="submit"
        >保存</el-button
      >
    </template>
  </el-drawer>
</template>
