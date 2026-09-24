<script setup lang="ts">
import { DocumentChecked, FullScreen, Plus, Printer } from '@element-plus/icons-vue';
import {
  ElAlert,
  ElButton,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElSegmented,
  ElSlider,
  ElTag,
} from 'element-plus';
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import AppPageHeader from '../../../shared/components/AppPageHeader.vue';
import { useSessionStore } from '../../../shared/session';
import UiDialog from '../../../ui/UiDialog.vue';
import { useLayoutMode } from '../../../ui/useLayoutMode';
import { formApi } from '../api/designer-api';
import A4Grid from '../components/A4Grid.vue';
import A4Sheet from '../components/A4Sheet.vue';
import DefinitionNavigator from '../components/DefinitionNavigator.vue';
import FormFieldInspector from '../components/form/FormFieldInspector.vue';
import FormFieldPalette from '../components/form/FormFieldPalette.vue';
import type {
  FormDefinition,
  FormFieldModel,
  FormFieldType,
  FormSchema,
  PrintSchema,
} from '../types/designer';
import { platformErrorMessage } from '../utils/error';
import { isDefinitionReadOnly } from '../utils/definition-access';
import {
  cloneFormSchema,
  createDefaultFormSchema,
  createDefaultPrintSchema,
  createFormField,
  normalizeFormSchema,
  normalizePrintSchema,
  serializeFormSchema,
  syncPrintSchema,
  validateFormSchema,
} from '../utils/form';

type DesignerPanel = 'preview' | 'library' | 'fields' | 'properties';

const initialSchema = createDefaultFormSchema();
const session = useSessionStore();
const { isCompact } = useLayoutMode();
const definitions = ref<FormDefinition[]>([]);
const selectedDefinitionId = ref<string | null>(null);
const selectedVersionId = ref<string | null>(null);
const selectedFieldId = ref<string | null>(null);
const schema = ref<FormSchema>(initialSchema);
const printSchema = ref<PrintSchema>(createDefaultPrintSchema(initialSchema));
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const dirty = ref(false);
const createDialogOpen = ref(false);
const createForm = reactive({ code: '', name: '', documentType: '', description: '' });
const a4Stage = ref<HTMLElement | null>(null);
const stageWidth = ref(850);
const zoomPercent = ref(100);
const fitWidth = ref(true);
let stageObserver: ResizeObserver | null = null;

const compactPanel = ref<DesignerPanel>('preview');
const compactPanelOptions: Array<{ label: string; value: DesignerPanel }> = [
  { label: '预览', value: 'preview' },
  { label: '表单库', value: 'library' },
  { label: '字段', value: 'fields' },
  { label: '属性', value: 'properties' },
];
const A4_WIDTH_PX = 210 * (96 / 25.4);

const activeDefinition = computed(
  () => definitions.value.find((item) => item.id === selectedDefinitionId.value) ?? null,
);
const activeVersion = computed(
  () =>
    activeDefinition.value?.versions.find((item) => item.id === selectedVersionId.value) ?? null,
);
const selectedField = computed(
  () => schema.value.fields.find((field) => field.id === selectedFieldId.value) ?? null,
);
const canManage = computed(() => session.can('FORM_DESIGN_MANAGE'));
const readonly = computed(() => isDefinitionReadOnly(activeVersion.value?.status, canManage.value));
const previewFields = computed(() =>
  schema.value.fields.filter(
    (field) => field.type !== 'opinions' || printSchema.value.options.showApprovalOpinions,
  ),
);
const previewScale = computed(() =>
  fitWidth.value
    ? Math.min(1, Math.max(0.2, stageWidth.value / A4_WIDTH_PX))
    : zoomPercent.value / 100,
);
const displayedZoom = computed(() => Math.round(previewScale.value * 100));

onMounted(() => {
  void initialize();
  ensurePreviewPanel();
  window.addEventListener('beforeprint', ensurePreviewPanel);
});
onBeforeUnmount(() => {
  stageObserver?.disconnect();
  window.removeEventListener('beforeprint', ensurePreviewPanel);
});
watch(a4Stage, (element) => {
  stageObserver?.disconnect();
  stageObserver = null;
  if (!element) return;
  stageObserver = new ResizeObserver(([entry]) => {
    if (entry) stageWidth.value = entry.contentRect.width;
  });
  stageObserver.observe(element);
});

function panelVisible(panel: DesignerPanel): boolean {
  return !isCompact.value || compactPanel.value === panel;
}

/** 打印隔离样式只作用于当前画布：打印前确保 A4 预览处于挂载状态。 */
function ensurePreviewPanel(): void {
  if (isCompact.value) compactPanel.value = 'preview';
}

async function initialize(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    definitions.value = await formApi.list();
    selectInitial();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '表单定义加载失败';
  } finally {
    loading.value = false;
  }
}

function selectInitial(preferredDefinitionId?: string, preferredVersionId?: string): void {
  const definition =
    definitions.value.find((item) => item.id === preferredDefinitionId) ??
    definitions.value.find((item) => item.id === selectedDefinitionId.value) ??
    definitions.value[0];
  if (!definition) return;
  const version =
    definition.versions.find((item) => item.id === preferredVersionId) ??
    [...definition.versions].sort((a, b) => {
      if (a.status === 'DRAFT' && b.status !== 'DRAFT') return -1;
      if (b.status === 'DRAFT' && a.status !== 'DRAFT') return 1;
      return b.version - a.version;
    })[0];
  selectedDefinitionId.value = definition.id;
  selectedVersionId.value = version?.id ?? null;
  const nextSchema = version
    ? normalizeFormSchema(version.schemaJson, definition.name)
    : createDefaultFormSchema(definition.name);
  schema.value = nextSchema;
  printSchema.value = normalizePrintSchema(nextSchema, version?.printSchemaJson ?? null);
  selectedFieldId.value = nextSchema.fields[0]?.id ?? null;
  dirty.value = false;
}

async function confirmDiscard(): Promise<boolean> {
  if (!dirty.value) return true;
  try {
    await ElMessageBox.confirm('当前表单有未保存修改，继续操作将丢失这些修改。', '切换表单', {
      confirmButtonText: '放弃修改',
      cancelButtonText: '继续编辑',
      type: 'warning',
    });
    return true;
  } catch {
    return false;
  }
}

async function selectDefinition(id: string): Promise<void> {
  if (id === selectedDefinitionId.value || !(await confirmDiscard())) return;
  selectInitial(id);
}

async function selectVersion(definitionId: string, versionId: string): Promise<void> {
  if (versionId === selectedVersionId.value || !(await confirmDiscard())) return;
  selectInitial(definitionId, versionId);
}

function markSchema(next: FormSchema): void {
  if (readonly.value) return;
  schema.value = next;
  dirty.value = true;
}

function markPrint(next: PrintSchema): void {
  if (readonly.value) return;
  printSchema.value = next;
  dirty.value = true;
}

function addField(type: FormFieldType, beforeId?: string | null): void {
  if (readonly.value) return;
  const field = createFormField(type);
  const fields = [...schema.value.fields];
  const index = beforeId ? fields.findIndex((item) => item.id === beforeId) : -1;
  fields.splice(index >= 0 ? index : fields.length, 0, field);
  markSchema({ ...schema.value, fields });
  selectedFieldId.value = field.id;
}

function updateField(field: FormFieldModel): void {
  markSchema({
    ...schema.value,
    fields: schema.value.fields.map((item) => (item.id === field.id ? field : item)),
  });
}

function removeField(): void {
  if (!selectedFieldId.value || readonly.value) return;
  const index = schema.value.fields.findIndex((field) => field.id === selectedFieldId.value);
  const fields = schema.value.fields.filter((field) => field.id !== selectedFieldId.value);
  markSchema({ ...schema.value, fields });
  selectedFieldId.value = fields[Math.min(index, fields.length - 1)]?.id ?? null;
}

function removeFieldById(id: string): void {
  if (readonly.value) return;
  selectedFieldId.value = id;
  removeField();
}

function moveField(direction: -1 | 1, id: string | null = selectedFieldId.value): void {
  if (!id) return;
  const index = schema.value.fields.findIndex((field) => field.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= schema.value.fields.length || readonly.value) return;
  const fields = [...schema.value.fields];
  [fields[index], fields[target]] = [fields[target], fields[index]];
  markSchema({ ...schema.value, fields });
}

function moveFieldById(id: string, direction: -1 | 1): void {
  moveField(direction, id);
}

function paletteDragStart(event: DragEvent, type: FormFieldType): void {
  event.dataTransfer?.setData('application/x-oa-field-type', type);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy';
}

function fieldDragStart(event: DragEvent, id: string): void {
  event.dataTransfer?.setData('application/x-oa-field-id', id);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}

function fieldDrop(event: DragEvent, targetId: string | null): void {
  if (readonly.value) return;
  const type = event.dataTransfer?.getData('application/x-oa-field-type') as
    | FormFieldType
    | undefined;
  if (type) {
    addField(type, targetId);
    return;
  }
  const sourceId = event.dataTransfer?.getData('application/x-oa-field-id');
  if (!sourceId || sourceId === targetId) return;
  const fields = schema.value.fields.filter((field) => field.id !== sourceId);
  const source = schema.value.fields.find((field) => field.id === sourceId);
  if (!source) return;
  const targetIndex = targetId ? fields.findIndex((field) => field.id === targetId) : fields.length;
  fields.splice(targetIndex >= 0 ? targetIndex : fields.length, 0, source);
  markSchema({ ...schema.value, fields });
}

async function printForm(): Promise<void> {
  ensurePreviewPanel();
  await nextTick();
  window.print();
}

function fitPreviewToWidth(): void {
  fitWidth.value = true;
}

function setCustomZoom(): void {
  fitWidth.value = false;
}

async function createDefinition(): Promise<void> {
  if (!canManage.value) return;
  if (
    !/^[A-Z][A-Z0-9_]*$/.test(createForm.code) ||
    !createForm.name.trim() ||
    (createForm.documentType && !/^[A-Z][A-Z0-9_]*$/.test(createForm.documentType))
  ) {
    ElMessage.warning('请填写名称，编码需使用大写字母、数字和下划线');
    return;
  }
  saving.value = true;
  try {
    const nextSchema = createDefaultFormSchema(createForm.name.trim());
    const created = await formApi.create({
      code: createForm.code,
      name: createForm.name.trim(),
      documentType: createForm.documentType.trim() || undefined,
      description: createForm.description.trim(),
      schemaJson: serializeFormSchema(nextSchema),
      printSchemaJson: createDefaultPrintSchema(nextSchema),
      changeNote: '创建表单定义',
    });
    createDialogOpen.value = false;
    Object.assign(createForm, { code: '', name: '', documentType: '', description: '' });
    await reload(created.id, created.versions[0]?.id);
    ElMessage.success('表单定义已创建');
  } catch (cause) {
    ElMessage.error(platformErrorMessage(cause, '表单定义创建失败'));
  } finally {
    saving.value = false;
  }
}

async function persist(showMessage = true): Promise<boolean> {
  if (!activeVersion.value || readonly.value) return false;
  saving.value = true;
  try {
    const syncedPrintSchema = syncPrintSchema(schema.value, printSchema.value);
    await formApi.updateVersion(activeVersion.value.id, {
      schemaJson: serializeFormSchema(cloneFormSchema(schema.value)),
      printSchemaJson: syncedPrintSchema,
      changeNote: '调整 A4 表单结构和打印配置',
    });
    printSchema.value = syncedPrintSchema;
    dirty.value = false;
    if (showMessage) ElMessage.success('表单草稿已保存');
    return true;
  } catch (cause) {
    ElMessage.error(platformErrorMessage(cause, '表单草稿保存失败'));
    return false;
  } finally {
    saving.value = false;
  }
}

async function publish(): Promise<void> {
  if (!activeVersion.value || readonly.value) return;
  const errors = validateFormSchema(schema.value);
  if (errors.length > 0) {
    ElMessage.error(errors[0]);
    return;
  }
  if (!(await persist(false))) return;
  try {
    await ElMessageBox.confirm(
      '发布后该版本不可直接修改，新建业务单据将使用此表单结构。',
      '发布表单',
      {
        confirmButtonText: '确认发布',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );
  } catch {
    return;
  }
  saving.value = true;
  try {
    await formApi.publish(activeVersion.value.id);
    await reload(activeDefinition.value?.id, activeVersion.value.id);
    ElMessage.success('表单版本已发布');
  } catch (cause) {
    ElMessage.error(platformErrorMessage(cause, '表单版本发布失败'));
  } finally {
    saving.value = false;
  }
}

async function copyVersion(definitionId: string, versionId: string): Promise<void> {
  if (!canManage.value) return;
  if (!(await confirmDiscard())) return;
  try {
    const version = await formApi.copyVersion(definitionId, versionId);
    await reload(definitionId, version.id);
    ElMessage.success('已复制为新草稿版本');
  } catch (cause) {
    ElMessage.error(platformErrorMessage(cause, '表单版本复制失败'));
  }
}

async function reload(definitionId?: string, versionId?: string): Promise<void> {
  definitions.value = await formApi.list();
  selectInitial(definitionId, versionId);
}
</script>

<template>
  <div class="form-page ui-page">
    <AppPageHeader
      description="以 210 × 297 mm 纸张为设计基准，统一配置录入字段、打印网格、附件清单和审批意见。"
      eyebrow="系统设置"
      title="A4 审批表单设计"
    >
      <template #actions>
        <div class="ui-actions">
          <ElTag v-if="activeVersion" :type="activeVersion.status === 'PUBLISHED' ? 'success' : 'warning'">
            V{{ activeVersion.version }} · {{ activeVersion.status === 'PUBLISHED' ? '已发布' : '草稿' }}
          </ElTag>
          <ElButton @click="printForm">
            <ElIcon><Printer /></ElIcon>打印预览
          </ElButton>
          <ElButton :disabled="readonly || !dirty" :loading="saving" @click="persist()">
            <ElIcon><DocumentChecked /></ElIcon>保存草稿
          </ElButton>
          <ElButton :disabled="readonly" :loading="saving" type="primary" @click="publish">发布版本</ElButton>
        </div>
      </template>
    </AppPageHeader>

    <ElAlert v-if="error" :closable="false" show-icon :title="error" type="error" />
    <ElAlert
      v-else-if="!canManage"
      :closable="false"
      show-icon
      title="当前账号仅可查看表单定义，编辑、复制和发布操作已关闭"
      type="info"
    />

    <div class="form-designer-shell" :data-compact="isCompact">
      <nav v-if="isCompact" class="form-designer-mobile-tabs" aria-label="表单设计面板">
        <ElSegmented v-model="compactPanel" :options="compactPanelOptions" />
      </nav>

      <DefinitionNavigator
        v-if="panelVisible('library')"
        :definitions="definitions"
        :loading="loading"
        noun="表单"
        :readonly="!canManage"
        :selected-definition-id="selectedDefinitionId"
        :selected-version-id="selectedVersionId"
        @copy-version="copyVersion"
        @create="createDialogOpen = true"
        @select-definition="selectDefinition"
        @select-version="selectVersion"
      />

      <FormFieldPalette
        v-if="panelVisible('fields')"
        :disabled="readonly"
        :fields="schema.fields"
        :selected-field-id="selectedFieldId"
        @add="addField"
        @drag-start="paletteDragStart"
        @move="moveFieldById"
        @remove="removeFieldById"
        @select="selectedFieldId = $event"
      />

      <main v-if="panelVisible('preview')" class="form-canvas-workspace">
        <div class="designer-toolbar">
          <div class="designer-toolbar__copy">
            <strong>{{ activeDefinition?.name ?? '请选择表单' }}</strong>
            <small>A4 纵向 · {{ schema.fields.length }} 个字段 · 拖拽字段可调整顺序</small>
          </div>
          <div class="a4-zoom-controls">
            <ElButton :icon="FullScreen" :type="fitWidth ? 'primary' : 'default'" @click="fitPreviewToWidth">
              适应宽度
            </ElButton>
            <ElSlider
              v-model="zoomPercent"
              aria-label="A4 预览缩放比例"
              :max="125"
              :min="40"
              :step="5"
              @input="setCustomZoom"
            />
            <span>{{ displayedZoom }}%</span>
          </div>
        </div>
        <div ref="a4Stage" class="a4-stage">
          <A4Sheet
            :document-number="printSchema.options.showDocumentNumber ? '系统自动生成' : ''"
            :grid-line-width="printSchema.options.gridLineWidth"
            :margin-mm="printSchema.paper.marginMm.top"
            :style="{ zoom: previewScale }"
            :subtitle="schema.subtitle"
            :title="schema.title"
          >
            <A4Grid
              :editable="!readonly"
              :fields="previewFields"
              :selected-field-id="selectedFieldId"
              @field-drag-start="fieldDragStart"
              @field-drop="fieldDrop"
              @select="selectedFieldId = $event"
            />
          </A4Sheet>
        </div>
      </main>

      <FormFieldInspector
        v-if="panelVisible('properties')"
        :field="selectedField"
        :print-schema="printSchema"
        :readonly="readonly"
        :schema="schema"
        @move="moveField"
        @remove="removeField"
        @update-field="updateField"
        @update-print-schema="markPrint"
        @update-schema="markSchema"
      />
    </div>

    <UiDialog v-model="createDialogOpen" title="新建表单定义" :width="520">
      <ElForm class="ui-fields" label-position="top">
        <ElFormItem label="表单名称">
          <ElInput v-model="createForm.name" maxlength="100" placeholder="例如：合同付款审批单" />
        </ElFormItem>
        <ElFormItem label="表单编码">
          <ElInput
            v-model="createForm.code"
            maxlength="60"
            placeholder="CONTRACT_PAYMENT_FORM"
            @input="createForm.code = createForm.code.toUpperCase()"
          />
        </ElFormItem>
        <ElFormItem label="绑定单据类型">
          <ElInput
            v-model="createForm.documentType"
            maxlength="60"
            placeholder="可选，例如 CONTRACT_PAYMENT"
            @input="createForm.documentType = createForm.documentType.toUpperCase()"
          />
        </ElFormItem>
        <ElFormItem class="ui-field-full" label="用途说明">
          <ElInput v-model="createForm.description" maxlength="300" :rows="3" type="textarea" />
        </ElFormItem>
      </ElForm>
      <template #footer>
        <ElButton @click="createDialogOpen = false">取消</ElButton>
        <ElButton :loading="saving" type="primary" @click="createDefinition">
          <ElIcon><Plus /></ElIcon>创建
        </ElButton>
      </template>
    </UiDialog>
  </div>
</template>

<style scoped>
.form-page {
  min-width: 0;
}
.form-designer-shell {
  display: grid;
  min-height: 880px;
  grid-template-areas:
    'definitions canvas inspector'
    'fields canvas inspector';
  grid-template-columns: 235px minmax(0, 1fr) 300px;
  grid-template-rows: 360px minmax(520px, 1fr);
  overflow: hidden;
  background: var(--color-canvas);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}
.form-designer-shell > :deep(.definition-nav) {
  grid-area: definitions;
  border-right: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  border-radius: var(--radius-lg) 0 0 0;
}
.form-designer-shell > :deep(.form-palette) {
  grid-area: fields;
}
.form-designer-shell > :deep(.form-inspector) {
  grid-area: inspector;
}
.form-canvas-workspace {
  min-width: 0;
  grid-area: canvas;
  background: var(--color-surface);
}
.designer-toolbar {
  display: flex;
  min-height: 58px;
  align-items: center;
  gap: var(--space-sm);
  padding: var(--space-sm) var(--space-lg);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}
.designer-toolbar__copy {
  display: flex;
  min-width: 160px;
  flex: 1;
  flex-direction: column;
}
.designer-toolbar__copy small {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-caption);
}
.a4-zoom-controls {
  display: flex;
  min-width: 310px;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}
.a4-zoom-controls :deep(.el-slider) {
  width: 120px;
}
.a4-zoom-controls > span {
  min-width: 52px;
  padding: 5px 9px;
  color: var(--color-text-secondary);
  background: var(--color-surface-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xs);
  font-size: 12px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}
.a4-stage {
  height: calc(100% - 58px);
  min-height: 820px;
  padding: var(--space-lg);
  overflow: auto;
}
.form-designer-mobile-tabs {
  padding: 12px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}
.form-designer-mobile-tabs :deep(.el-segmented) {
  width: 100%;
}
.form-designer-mobile-tabs :deep(.el-segmented__item) {
  min-width: 0;
  flex: 1;
}
.form-designer-shell[data-compact='true'] {
  display: block;
  min-height: 0;
  overflow: visible;
}
.form-designer-shell[data-compact='true'] > :deep(.definition-nav) {
  height: 320px;
  border-right: 0;
  border-radius: 0;
}
.form-designer-shell[data-compact='true'] .designer-toolbar {
  align-items: stretch;
  flex-direction: column;
  padding: 12px 16px;
}
.form-designer-shell[data-compact='true'] .designer-toolbar__copy {
  min-width: 0;
}
.form-designer-shell[data-compact='true'] .a4-zoom-controls {
  min-width: 0;
  width: 100%;
  justify-content: flex-start;
  flex-wrap: wrap;
}
.form-designer-shell[data-compact='true'] .a4-zoom-controls :deep(.el-slider) {
  min-width: 90px;
  flex: 1;
}
.form-designer-shell[data-compact='true'] .a4-stage {
  height: auto;
  min-height: 480px;
  padding: 16px;
  overflow-x: auto;
}
</style>

<style>
/* A4 打印隔离：只隐藏 .form-page 内的界面，纸张保持可见并铺满 A4（不作用其它业务打印页）。 */
@page {
  size: A4 portrait;
  margin: 0;
}

@media print {
  html,
  body,
  #app {
    width: 210mm;
    min-width: 210mm;
    margin: 0;
    padding: 0;
    background: #fff !important;
  }

  .form-page * {
    visibility: hidden !important;
  }

  .form-page .form-canvas-workspace {
    display: block !important;
  }

  .form-page .a4-sheet,
  .form-page .a4-sheet * {
    visibility: visible !important;
  }

  .form-page .a4-sheet {
    position: absolute;
    top: 0;
    left: 0;
    width: 210mm;
    min-height: 297mm;
    margin: 0;
    box-shadow: none;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }

  .form-page .a4-grid__field {
    break-inside: avoid;
    outline: 0 !important;
  }

  .form-page .a4-sheet__footer {
    break-inside: avoid;
  }
}
</style>
