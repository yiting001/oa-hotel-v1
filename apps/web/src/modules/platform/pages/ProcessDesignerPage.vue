<script setup lang="ts">
import {
  CircleCloseFilled,
  Delete,
  DocumentChecked,
  Plus,
  Share,
  UserFilled,
  VideoPlay,
} from '@element-plus/icons-vue';
import {
  ElAlert,
  ElButton,
  ElButtonGroup,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElSegmented,
  ElTabPane,
  ElTabs,
  ElTag,
} from 'element-plus';
import { computed, onMounted, reactive, ref } from 'vue';
import AppPageHeader from '../../../shared/components/AppPageHeader.vue';
import { randomId } from '../../../shared/random-id';
import { useSessionStore } from '../../../shared/session';
import UiDialog from '../../../ui/UiDialog.vue';
import { useLayoutMode } from '../../../ui/useLayoutMode';
import { processApi } from '../api/designer-api';
import { iamApi } from '../api/iam-api';
import DefinitionNavigator from '../components/DefinitionNavigator.vue';
import ApprovalChainPanel from '../components/process/ApprovalChainPanel.vue';
import ProcessCanvas from '../components/process/ProcessCanvas.vue';
import ProcessNodeInspector from '../components/process/ProcessNodeInspector.vue';
import type {
  ProcessDefinition,
  ProcessDesign,
  ProcessNodeModel,
  ProcessNodeType,
} from '../types/designer';
import type { IamUser, RoleSummary } from '../types/iam';
import { platformErrorMessage } from '../utils/error';
import { isDefinitionReadOnly } from '../utils/definition-access';
import {
  cloneProcessDesign,
  createDefaultProcessDesign,
  createProcessNode,
  validateProcessDesign,
} from '../utils/process';

type DesignerPanel = 'canvas' | 'library' | 'inspector';

const session = useSessionStore();
const { isCompact } = useLayoutMode();
const activeTab = ref('chains');
const definitions = ref<ProcessDefinition[]>([]);
const roles = ref<RoleSummary[]>([]);
const users = ref<IamUser[]>([]);
const selectedDefinitionId = ref<string | null>(null);
const selectedVersionId = ref<string | null>(null);
const selectedNodeId = ref<string | null>(null);
const selectedEdgeId = ref<string | null>(null);
const design = ref<ProcessDesign>(createDefaultProcessDesign());
const loading = ref(false);
const saving = ref(false);
const error = ref('');
const dirty = ref(false);
const createDialogOpen = ref(false);
const createForm = reactive({ code: '', name: '', documentType: '', description: '' });
const mobileView = ref<DesignerPanel>('canvas');
const mobileViewOptions: Array<{ label: string; value: DesignerPanel }> = [
  { label: '流程图', value: 'canvas' },
  { label: '流程库', value: 'library' },
  { label: '节点属性', value: 'inspector' },
];

const activeDefinition = computed(
  () => definitions.value.find((item) => item.id === selectedDefinitionId.value) ?? null,
);
const activeVersion = computed(
  () =>
    activeDefinition.value?.versions.find((item) => item.id === selectedVersionId.value) ?? null,
);
const selectedNode = computed(
  () => design.value.nodes.find((node) => node.id === selectedNodeId.value) ?? null,
);
const selectedEdge = computed(
  () => design.value.edges.find((edge) => edge.id === selectedEdgeId.value) ?? null,
);
const canManage = computed(() => session.can('PROCESS_DESIGN_MANAGE'));
const readonly = computed(() => isDefinitionReadOnly(activeVersion.value?.status, canManage.value));
/** 画布链路的自然顺序：从开始节点沿连线遍历；链路不完整时退回节点的存储顺序。 */
const chainOrder = computed<ProcessNodeModel[]>(() => {
  const ordered: ProcessNodeModel[] = [];
  const visited = new Set<string>();
  let current = design.value.nodes.find((node) => node.type === 'START');
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    ordered.push(current);
    const edge = design.value.edges.find((item) => item.source === current?.id);
    current = edge ? design.value.nodes.find((node) => node.id === edge.target) : undefined;
  }
  return ordered.length === design.value.nodes.length ? ordered : design.value.nodes;
});
const reorderable = computed(() => {
  const starts = design.value.nodes.filter((node) => node.type === 'START');
  const ends = design.value.nodes.filter((node) => node.type === 'END');
  return (
    starts.length === 1 &&
    ends.length === 1 &&
    design.value.edges.length === design.value.nodes.length - 1 &&
    chainOrder.value.length === design.value.nodes.length
  );
});

onMounted(() => void initialize());

function panelVisible(panel: DesignerPanel): boolean {
  return !isCompact.value || mobileView.value === panel;
}

async function initialize(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    const [loadedDefinitions, directory] = await Promise.all([
      processApi.list(),
      session.can('IAM_VIEW')
        ? Promise.all([iamApi.listRoles(), iamApi.listUsers()])
        : Promise.resolve([[], []] as [RoleSummary[], IamUser[]]),
    ]);
    definitions.value = loadedDefinitions;
    [roles.value, users.value] = directory;
    selectInitial();
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '流程定义加载失败';
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
  design.value = version ? cloneProcessDesign(version.designJson) : createDefaultProcessDesign();
  selectedNodeId.value = design.value.nodes[0]?.id ?? null;
  selectedEdgeId.value = null;
  dirty.value = false;
}

async function confirmDiscard(): Promise<boolean> {
  if (!dirty.value) return true;
  try {
    await ElMessageBox.confirm('当前流程有未保存修改，继续操作将丢失这些修改。', '切换流程', {
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

function updateDesign(next: ProcessDesign): void {
  if (readonly.value) return;
  design.value = next;
  dirty.value = true;
}

function updateNode(node: ProcessNodeModel): void {
  updateDesign({
    ...design.value,
    nodes: design.value.nodes.map((item) => (item.id === node.id ? node : item)),
  });
}

function addNode(type: ProcessNodeType): void {
  if (readonly.value) return;
  if (
    type !== 'USER_TASK' &&
    type !== 'MANUAL_CHOICE' &&
    design.value.nodes.some((node) => node.type === type)
  ) {
    ElMessage.warning(type === 'START' ? '流程只能有一个开始节点' : '流程只能有一个结束节点');
    return;
  }
  const tasks = design.value.nodes.filter((node) => node.type !== 'START' && node.type !== 'END');
  const node = createProcessNode(type, 220 + tasks.length * 180, 180 + (tasks.length % 2) * 120);
  const next = cloneProcessDesign(design.value);
  next.nodes.push(node);
  if (type === 'USER_TASK' || type === 'MANUAL_CHOICE') insertBeforeEnd(next, node);
  updateDesign(next);
  selectedNodeId.value = node.id;
  selectedEdgeId.value = null;
}

function insertBeforeEnd(next: ProcessDesign, node: ProcessNodeModel): void {
  const end = next.nodes.find((item) => item.type === 'END');
  if (!end) return;
  const incoming = next.edges.find((edge) => edge.target === end.id);
  if (incoming) {
    next.edges = next.edges.filter((edge) => edge.id !== incoming.id);
    next.edges.push({ id: randomId(), source: incoming.source, target: node.id });
  }
  next.edges.push({ id: randomId(), source: node.id, target: end.id });
}

function selectNode(id: string | null): void {
  selectedNodeId.value = id;
  selectedEdgeId.value = null;
}

function deleteSelection(): void {
  if (readonly.value) return;
  if (selectedNodeId.value) {
    const id = selectedNodeId.value;
    updateDesign({
      ...design.value,
      nodes: design.value.nodes.filter((node) => node.id !== id),
      edges: design.value.edges.filter((edge) => edge.source !== id && edge.target !== id),
    });
    selectedNodeId.value = null;
  } else if (selectedEdgeId.value) {
    updateDesign({
      ...design.value,
      edges: design.value.edges.filter((edge) => edge.id !== selectedEdgeId.value),
    });
    selectedEdgeId.value = null;
  }
}

function removeNode(id: string): void {
  if (readonly.value) return;
  selectNode(id);
  deleteSelection();
}

/** 链路顺序调整：仅在同一链路上的审批节点之间交换，随后按链路顺序重排坐标与连线。 */
function moveNode(id: string, direction: -1 | 1): void {
  if (readonly.value || !reorderable.value) return;
  const ordered = [...chainOrder.value];
  const index = ordered.findIndex((node) => node.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ordered.length) return;
  const movable = (node: { type: string } | undefined): boolean =>
    node?.type === 'USER_TASK' || node?.type === 'MANUAL_CHOICE';
  if (!movable(ordered[index]) || !movable(ordered[target])) return;
  [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
  updateDesign({
    ...design.value,
    nodes: ordered.map((node, position) => ({
      ...node,
      position: { x: 220 + position * 180, y: 180 + (position % 2) * 120 },
    })),
    edges: ordered.slice(0, -1).map((node, position) => ({
      id: randomId(),
      source: node.id,
      target: ordered[position + 1]?.id ?? node.id,
    })),
  });
  selectedEdgeId.value = null;
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
    const created = await processApi.create({
      code: createForm.code,
      name: createForm.name.trim(),
      documentType: createForm.documentType.trim() || undefined,
      description: createForm.description.trim(),
      designJson: createDefaultProcessDesign(),
      changeNote: '创建流程定义',
    });
    createDialogOpen.value = false;
    Object.assign(createForm, { code: '', name: '', documentType: '', description: '' });
    await reload(created.id, created.versions[0]?.id);
    ElMessage.success('流程定义已创建');
  } catch (cause) {
    ElMessage.error(platformErrorMessage(cause, '流程定义创建失败'));
  } finally {
    saving.value = false;
  }
}

async function persist(showMessage = true): Promise<boolean> {
  if (!activeVersion.value || readonly.value) return false;
  saving.value = true;
  try {
    await processApi.updateVersion(activeVersion.value.id, {
      designJson: cloneProcessDesign(design.value),
      changeNote: '调整审批节点及办理人规则',
    });
    dirty.value = false;
    if (showMessage) ElMessage.success('流程草稿已保存');
    return true;
  } catch (cause) {
    ElMessage.error(platformErrorMessage(cause, '流程草稿保存失败'));
    return false;
  } finally {
    saving.value = false;
  }
}

async function publish(): Promise<void> {
  if (!activeVersion.value || readonly.value) return;
  const errors = validateProcessDesign(design.value);
  if (errors.length > 0) {
    ElMessage.error(errors[0]);
    return;
  }
  if (!(await persist(false))) return;
  try {
    await ElMessageBox.confirm(
      '发布后该版本不可直接修改，新的业务单据将按此流程运行。',
      '发布流程',
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
    await processApi.publish(activeVersion.value.id);
    await reload(activeDefinition.value?.id, activeVersion.value.id);
    ElMessage.success('流程版本已发布');
  } catch (cause) {
    ElMessage.error(platformErrorMessage(cause, '流程版本发布失败'));
  } finally {
    saving.value = false;
  }
}

async function copyVersion(definitionId: string, versionId: string): Promise<void> {
  if (!canManage.value) return;
  if (!(await confirmDiscard())) return;
  try {
    const version = await processApi.copyVersion(definitionId, versionId);
    await reload(definitionId, version.id);
    ElMessage.success('已复制为新草稿版本');
  } catch (cause) {
    ElMessage.error(platformErrorMessage(cause, '流程版本复制失败'));
  }
}

async function reload(definitionId?: string, versionId?: string): Promise<void> {
  definitions.value = await processApi.list();
  selectInitial(definitionId, versionId);
}
</script>

<template>
  <div class="process-page ui-page">
    <AppPageHeader
      description="链路快捷配置直接编排角色审批顺序；流程画布以版本化流程定义配置节点、流转关系和办理人规则。"
      eyebrow="系统设置"
      title="审批流程设计"
    >
      <template v-if="activeTab === 'design'" #actions>
        <div class="ui-actions">
          <ElTag v-if="activeVersion" :type="activeVersion.status === 'PUBLISHED' ? 'success' : 'warning'">
            V{{ activeVersion.version }} · {{ activeVersion.status === 'PUBLISHED' ? '已发布' : '草稿' }}
          </ElTag>
          <ElButton :disabled="readonly || !dirty" :loading="saving" @click="persist()">
            <ElIcon><DocumentChecked /></ElIcon>
            保存草稿
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
      title="当前账号仅可查看流程定义，编辑、复制和发布操作已关闭"
      type="info"
    />

    <ElTabs v-model="activeTab">
      <ElTabPane label="链路快捷配置" name="chains">
        <ApprovalChainPanel v-if="activeTab === 'chains'" />
      </ElTabPane>
      <ElTabPane label="流程画布" name="design">
        <div class="process-designer-shell" :data-compact="isCompact">
          <div v-if="isCompact" class="process-mobile-view-switch">
            <ElSegmented v-model="mobileView" aria-label="切换流程设计区域" :options="mobileViewOptions" />
          </div>

          <DefinitionNavigator
            v-if="panelVisible('library')"
            class="process-mobile-panel"
            :definitions="definitions"
            :loading="loading"
            noun="流程"
            :readonly="!canManage"
            :selected-definition-id="selectedDefinitionId"
            :selected-version-id="selectedVersionId"
            @copy-version="copyVersion"
            @create="createDialogOpen = true"
            @select-definition="selectDefinition"
            @select-version="selectVersion"
          />

          <main v-if="panelVisible('canvas')" class="process-workspace process-mobile-panel">
            <div class="designer-toolbar">
              <div class="designer-toolbar__copy">
                <strong>{{ activeDefinition?.name ?? '请选择流程' }}</strong>
                <small>{{ activeDefinition?.code ?? '未选择定义' }}</small>
              </div>
              <ElButtonGroup>
                <ElButton :disabled="readonly" title="添加开始节点" @click="addNode('START')">
                  <ElIcon><VideoPlay /></ElIcon>开始
                </ElButton>
                <ElButton :disabled="readonly" title="添加选择下一步节点" @click="addNode('MANUAL_CHOICE')">
                  <ElIcon><Share /></ElIcon>选择下一步
                </ElButton>
                <ElButton :disabled="readonly" title="添加审批节点" @click="addNode('USER_TASK')">
                  <ElIcon><UserFilled /></ElIcon>审批
                </ElButton>
                <ElButton :disabled="readonly" title="添加结束节点" @click="addNode('END')">
                  <ElIcon><CircleCloseFilled /></ElIcon>结束
                </ElButton>
              </ElButtonGroup>
              <ElButton
                :disabled="readonly || (!selectedNodeId && !selectedEdgeId)"
                plain
                type="danger"
                @click="deleteSelection"
              >
                <ElIcon><Delete /></ElIcon>删除选中
              </ElButton>
            </div>
            <ProcessCanvas
              :design="design"
              :readonly="readonly"
              :selected-edge-id="selectedEdgeId"
              :selected-node-id="selectedNodeId"
              @select-edge="selectedEdgeId = $event"
              @select-node="selectNode"
              @update="updateDesign"
            />
          </main>

          <ProcessNodeInspector
            v-if="panelVisible('inspector')"
            class="process-mobile-panel"
            :chain-order="chainOrder"
            :node="selectedNode"
            :readonly="readonly"
            :reorderable="reorderable"
            :roles="roles"
            :selected-edge="selectedEdge"
            :selected-node-id="selectedNodeId"
            :users="users"
            @add="addNode"
            @move="moveNode"
            @remove="removeNode"
            @select="selectNode"
            @update="updateNode"
          />
        </div>
      </ElTabPane>
    </ElTabs>

    <UiDialog v-model="createDialogOpen" title="新建流程定义" :width="520">
      <ElForm class="ui-fields" label-position="top">
        <ElFormItem label="流程名称">
          <ElInput v-model="createForm.name" maxlength="100" placeholder="例如：合同付款审批" />
        </ElFormItem>
        <ElFormItem label="流程编码">
          <ElInput
            v-model="createForm.code"
            maxlength="60"
            placeholder="CONTRACT_PAYMENT_APPROVAL"
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
.process-page {
  min-width: 0;
}
.process-page :deep(.el-tabs__content) {
  padding-top: 24px;
}
.process-designer-shell {
  display: grid;
  min-height: 680px;
  grid-template-columns: 250px minmax(0, 1fr) 300px;
  overflow: hidden;
  background: var(--color-canvas);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}
.process-designer-shell > :deep(.definition-nav) {
  border-right: 1px solid var(--color-border);
  border-radius: var(--radius-lg) 0 0 var(--radius-lg);
}
.process-workspace {
  min-width: 0;
  background: var(--color-canvas);
}
.designer-toolbar {
  display: flex;
  min-height: 62px;
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
.process-designer-shell :deep(.process-canvas) {
  border-radius: 0;
}
.process-mobile-view-switch {
  padding: 12px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}
.process-mobile-view-switch :deep(.el-segmented) {
  width: 100%;
}
.process-mobile-view-switch :deep(.el-segmented__item) {
  min-width: 0;
  flex: 1;
}
.process-designer-shell[data-compact='true'] {
  display: block;
  min-height: 0;
  border-radius: var(--radius-lg);
}
.process-designer-shell[data-compact='true'] > .process-workspace {
  display: flex;
  min-width: 0;
  flex-direction: column;
}
.process-designer-shell[data-compact='true'] .designer-toolbar {
  align-items: stretch;
  flex-direction: column;
  padding: 12px 16px;
}
.process-designer-shell[data-compact='true'] .designer-toolbar__copy {
  min-width: 0;
}
.process-designer-shell[data-compact='true'] .designer-toolbar :deep(.el-button-group) {
  display: flex;
  width: 100%;
}
.process-designer-shell[data-compact='true'] .designer-toolbar :deep(.el-button-group > .el-button) {
  min-width: 0;
  flex: 1;
  padding-inline: 8px;
}
.process-designer-shell[data-compact='true'] .designer-toolbar > :deep(.el-button) {
  width: 100%;
}
.process-designer-shell[data-compact='true'] :deep(.definition-nav) {
  min-height: 420px;
  border-right: 0;
  border-radius: var(--radius-lg);
}
.process-designer-shell[data-compact='true'] :deep(.process-canvas) {
  height: 520px;
}
</style>
