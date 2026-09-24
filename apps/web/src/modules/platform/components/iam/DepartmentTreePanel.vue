<script setup lang="ts">
import { ArrowLeft, Delete, Edit, Plus, Refresh } from '@element-plus/icons-vue';
import {
  ElButton,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElInputNumber,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElSelect,
  ElSwitch,
  ElTag,
  ElTree,
} from 'element-plus';
import { computed, reactive, ref, watch } from 'vue';
import KeyValueSummary from '../../../../shared/components/KeyValueSummary.vue';
import UiDataList, { type DataColumn } from '../../../../ui/UiDataList.vue';
import UiDialog from '../../../../ui/UiDialog.vue';
import { useLayoutMode } from '../../../../ui/useLayoutMode';
import { iamApi } from '../../api/iam-api';
import type { DepartmentNode, IamUser, Position } from '../../types/iam';
import { platformErrorMessage } from '../../utils/error';
import { findDepartment, flattenDepartments } from '../../utils/iam';

const props = defineProps<{
  departments: DepartmentNode[];
  positions: Position[];
  users: IamUser[];
  loading: boolean;
  readonly: boolean;
}>();
const emit = defineEmits<{ refresh: [] }>();
const { isCompact } = useLayoutMode();
const departmentView = ref<'tree' | 'detail'>('tree');
const positionColumns: DataColumn[] = [
  { key: 'name', label: '岗位名称', minWidth: 150 },
  { key: 'code', label: '岗位编码', minWidth: 160 },
  { key: 'sortOrder', label: '排序', width: 90 },
  { key: 'active', label: '状态', width: 100 },
  { key: 'actions', label: '操作', width: 150 },
];

const selectedId = ref<string | null>(null);
const departmentDialogOpen = ref(false);
const positionDialogOpen = ref(false);
const saving = ref(false);
const editingDepartmentId = ref<string | null>(null);
const editingPositionId = ref<string | null>(null);
const departmentForm = reactive({
  code: '',
  name: '',
  parentId: null as string | null,
  managerUserId: null as string | null,
  sortOrder: 0,
  active: true,
});
const positionForm = reactive({ code: '', name: '', sortOrder: 0, active: true });

const flatDepartments = computed(() => flattenDepartments(props.departments));
const selectedDepartment = computed(() => findDepartment(props.departments, selectedId.value));
const selectedPositions = computed(() =>
  props.positions.filter((position) => position.departmentId === selectedId.value),
);
const selectedFacts = computed(() => [
  {
    label: '上级部门',
    value:
      findDepartment(props.departments, selectedDepartment.value?.parentId ?? null)?.name ?? '无',
  },
  {
    label: '部门负责人',
    value:
      props.users.find((user) => user.id === selectedDepartment.value?.managerUserId)?.displayName ??
      '未设置',
  },
  { label: '状态', value: selectedDepartment.value?.active === false ? '停用' : '正常' },
]);

watch(
  () => props.departments,
  (departments) => {
    if (!findDepartment(departments, selectedId.value)) {
      selectedId.value = departments[0]?.id ?? null;
    }
  },
  { immediate: true },
);

function openDepartment(mode: 'root' | 'child' | 'edit'): void {
  if (props.readonly) return;
  const current = selectedDepartment.value;
  editingDepartmentId.value = mode === 'edit' ? (current?.id ?? null) : null;
  Object.assign(departmentForm, {
    code: mode === 'edit' ? (current?.code ?? '') : '',
    name: mode === 'edit' ? (current?.name ?? '') : '',
    parentId:
      mode === 'child'
        ? (current?.id ?? null)
        : mode === 'edit'
          ? (current?.parentId ?? null)
          : null,
    managerUserId: mode === 'edit' ? (current?.managerUserId ?? null) : null,
    sortOrder: mode === 'edit' ? (current?.sortOrder ?? 0) : 0,
    active: mode === 'edit' ? (current?.active ?? true) : true,
  });
  departmentDialogOpen.value = true;
}

function openPosition(value?: unknown): void {
  if (props.readonly) return;
  const position = value as Position | undefined;
  editingPositionId.value = position?.id ?? null;
  Object.assign(positionForm, {
    code: position?.code ?? '',
    name: position?.name ?? '',
    sortOrder: position?.sortOrder ?? 0,
    active: position?.active ?? true,
  });
  positionDialogOpen.value = true;
}

function selectDepartment(node: unknown): void {
  if (!node) return;
  selectedId.value = (node as DepartmentNode).id;
  departmentView.value = 'detail';
}

async function saveDepartment(): Promise<void> {
  if (props.readonly) return;
  if (!departmentForm.code.trim() || !departmentForm.name.trim()) {
    ElMessage.warning('请填写部门编码和名称');
    return;
  }
  saving.value = true;
  try {
    const payload = {
      ...departmentForm,
      code: departmentForm.code.trim(),
      name: departmentForm.name.trim(),
    };
    if (editingDepartmentId.value) {
      await iamApi.updateDepartment(editingDepartmentId.value, payload);
    } else {
      await iamApi.createDepartment(payload);
    }
    ElMessage.success('部门信息已保存');
    departmentDialogOpen.value = false;
    emit('refresh');
  } catch (cause) {
    ElMessage.error(platformErrorMessage(cause, '部门信息保存失败'));
  } finally {
    saving.value = false;
  }
}

async function savePosition(): Promise<void> {
  if (props.readonly) return;
  if (!selectedId.value || !positionForm.code.trim() || !positionForm.name.trim()) {
    ElMessage.warning('请填写岗位编码和名称');
    return;
  }
  saving.value = true;
  try {
    const payload = {
      ...positionForm,
      code: positionForm.code.trim(),
      name: positionForm.name.trim(),
      departmentId: selectedId.value,
    };
    if (editingPositionId.value) {
      await iamApi.updatePosition(editingPositionId.value, payload);
    } else {
      await iamApi.createPosition(payload);
    }
    ElMessage.success('岗位信息已保存');
    positionDialogOpen.value = false;
    emit('refresh');
  } catch (cause) {
    ElMessage.error(platformErrorMessage(cause, '岗位信息保存失败'));
  } finally {
    saving.value = false;
  }
}

async function removeDepartment(): Promise<void> {
  const department = selectedDepartment.value;
  if (props.readonly || !department) return;
  try {
    await ElMessageBox.confirm(
      `确定删除部门「${department.name}」吗？需先清空下级部门、岗位和人员任职。`,
      '删除部门',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    );
  } catch {
    return;
  }
  saving.value = true;
  try {
    await iamApi.deleteDepartment(department.id);
    ElMessage.success('部门已删除');
    selectedId.value = null;
    emit('refresh');
  } catch (cause) {
    ElMessage.error(platformErrorMessage(cause, '部门删除失败'));
  } finally {
    saving.value = false;
  }
}

async function removePosition(value: unknown): Promise<void> {
  if (props.readonly) return;
  const position = value as Position;
  try {
    await ElMessageBox.confirm(`确定删除岗位「${position.name}」吗？`, '删除岗位', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
  } catch {
    return;
  }
  saving.value = true;
  try {
    await iamApi.deletePosition(position.id);
    ElMessage.success('岗位已删除');
    emit('refresh');
  } catch (cause) {
    ElMessage.error(platformErrorMessage(cause, '岗位删除失败'));
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div class="department-panel" :data-compact="isCompact">
    <nav v-if="!isCompact || departmentView === 'tree'" class="department-tree" aria-label="组织架构">
      <div class="panel-heading">
        <div class="panel-heading__copy">
          <strong>组织架构</strong>
          <small>按层级维护部门及负责人</small>
        </div>
        <ElButton circle size="small" title="刷新" aria-label="刷新组织架构" @click="emit('refresh')">
          <ElIcon><Refresh /></ElIcon>
        </ElButton>
      </div>
      <div v-if="!readonly" class="ui-actions">
        <ElButton size="small" @click="openDepartment('root')">
          <ElIcon><Plus /></ElIcon>
          根部门
        </ElButton>
        <ElButton :disabled="!selectedDepartment" size="small" @click="openDepartment('child')">
          新增下级
        </ElButton>
      </div>
      <ElTree
        class="department-tree__nodes"
        :current-node-key="selectedId ?? undefined"
        :data="departments"
        :expand-on-click-node="false"
        :props="{ label: 'name', children: 'children' }"
        default-expand-all
        highlight-current
        node-key="id"
        @current-change="selectDepartment"
      >
        <template #default="{ data }">
          <span class="department-tree__node">
            <span>{{ data.name }}</span>
            <ElTag v-if="!data.active" effect="plain" size="small" type="info">停用</ElTag>
          </span>
        </template>
      </ElTree>
    </nav>

    <section v-if="!isCompact || departmentView === 'detail'" v-loading="loading" class="department-detail">
      <ElButton v-if="isCompact" class="department-detail__back" @click="departmentView = 'tree'">
        <ElIcon><ArrowLeft /></ElIcon>
        返回组织架构
      </ElButton>
      <template v-if="selectedDepartment">
        <div class="panel-heading">
          <div class="panel-heading__copy">
            <strong>{{ selectedDepartment.name }}</strong>
            <small>{{ selectedDepartment.code }} · 排序 {{ selectedDepartment.sortOrder }}</small>
          </div>
          <div class="ui-actions">
            <ElButton v-if="!readonly" @click="openDepartment('edit')">
              <ElIcon><Edit /></ElIcon>
              编辑部门
            </ElButton>
            <ElButton v-if="!readonly" type="danger" @click="removeDepartment">
              <ElIcon><Delete /></ElIcon>
              删除部门
            </ElButton>
          </div>
        </div>
        <KeyValueSummary :columns="3" :items="selectedFacts" />
        <div class="panel-subheading">
          <div class="panel-heading__copy">
            <strong>部门岗位</strong>
            <small>岗位用于人员任职和流程办理人解析</small>
          </div>
          <ElButton v-if="!readonly" type="primary" @click="openPosition()">
            <ElIcon><Plus /></ElIcon>
            新增岗位
          </ElButton>
        </div>
        <UiDataList :rows="selectedPositions" :columns="positionColumns" empty-text="当前部门暂无岗位">
          <template #cell-active="{ row }">
            <ElTag :type="row.active ? 'success' : 'info'">{{ row.active ? '正常' : '停用' }}</ElTag>
          </template>
          <template #actions="{ row }">
            <template v-if="!readonly">
              <ElButton link @click="openPosition(row)">编辑</ElButton>
              <ElButton link type="danger" @click="removePosition(row)">删除</ElButton>
            </template>
          </template>
        </UiDataList>
      </template>
      <p v-else class="empty-hint">请选择左侧部门查看岗位配置</p>
    </section>
  </div>

  <UiDialog
    v-model="departmentDialogOpen"
    :title="editingDepartmentId ? '编辑部门' : '新增部门'"
    :width="520"
  >
    <ElForm class="ui-fields" label-position="top">
      <ElFormItem label="部门名称">
        <ElInput v-model="departmentForm.name" maxlength="80" />
      </ElFormItem>
      <ElFormItem label="部门编码">
        <ElInput v-model="departmentForm.code" maxlength="50" />
      </ElFormItem>
      <ElFormItem label="上级部门">
        <ElSelect v-model="departmentForm.parentId" clearable filterable placeholder="根部门">
          <ElOption
            v-for="item in flatDepartments.filter((item) => item.id !== editingDepartmentId)"
            :key="item.id"
            :label="item.name"
            :value="item.id"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="部门负责人">
        <ElSelect v-model="departmentForm.managerUserId" clearable filterable placeholder="暂不设置">
          <ElOption
            v-for="user in users"
            :key="user.id"
            :label="`${user.displayName}（${user.username}）`"
            :value="user.id"
          />
        </ElSelect>
      </ElFormItem>
      <ElFormItem label="排序">
        <ElInputNumber v-model="departmentForm.sortOrder" :min="0" controls-position="right" />
      </ElFormItem>
      <ElFormItem label="启用状态">
        <ElSwitch v-model="departmentForm.active" active-text="启用" inactive-text="停用" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="departmentDialogOpen = false">取消</ElButton>
      <ElButton v-if="!readonly" :loading="saving" type="primary" @click="saveDepartment">保存</ElButton>
    </template>
  </UiDialog>

  <UiDialog
    v-model="positionDialogOpen"
    :title="editingPositionId ? '编辑岗位' : '新增岗位'"
    :width="480"
  >
    <ElForm class="ui-fields" label-position="top">
      <ElFormItem label="岗位名称">
        <ElInput v-model="positionForm.name" maxlength="80" />
      </ElFormItem>
      <ElFormItem label="岗位编码">
        <ElInput v-model="positionForm.code" maxlength="50" />
      </ElFormItem>
      <ElFormItem label="排序">
        <ElInputNumber v-model="positionForm.sortOrder" :min="0" controls-position="right" />
      </ElFormItem>
      <ElFormItem label="启用状态">
        <ElSwitch v-model="positionForm.active" active-text="启用" inactive-text="停用" />
      </ElFormItem>
    </ElForm>
    <template #footer>
      <ElButton @click="positionDialogOpen = false">取消</ElButton>
      <ElButton v-if="!readonly" :loading="saving" type="primary" @click="savePosition">保存</ElButton>
    </template>
  </UiDialog>
</template>

<style scoped>
.department-panel {
  display: grid;
  min-height: 480px;
  grid-template-columns: 280px minmax(0, 1fr);
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.department-panel[data-compact='true'] {
  min-height: 0;
  grid-template-columns: minmax(0, 1fr);
}
.department-tree {
  min-width: 0;
  padding: 18px;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
}
.department-panel[data-compact='true'] .department-tree {
  border-right: 0;
  border-bottom: 1px solid var(--color-border);
}
.department-tree .ui-actions {
  margin: 15px 0 12px;
}
.department-tree__nodes {
  background: transparent;
}
.department-tree__nodes :deep(.el-tree-node__content) {
  min-height: 38px;
  margin-bottom: 2px;
  border-radius: var(--radius-sm);
}
.department-tree__node {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-right: 8px;
}
.department-detail {
  min-width: 0;
  padding: 22px 24px 28px;
}
.department-detail__back {
  margin-bottom: 16px;
}
.panel-heading,
.panel-subheading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
}
.panel-heading__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--space-xxs);
}
.panel-heading strong,
.panel-subheading strong {
  color: var(--color-text);
  font-size: var(--font-size-title-md);
  font-weight: 600;
}
.panel-heading small,
.panel-subheading small {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-caption);
  line-height: 1.5;
}
.panel-heading :deep(.el-button),
.panel-subheading :deep(.el-button) {
  height: var(--control-h-sm);
  padding-inline: 14px;
  font-size: var(--font-size-caption);
}
.panel-subheading {
  align-items: center;
  margin: var(--space-lg) 0 var(--space-sm);
}
.department-detail :deep(.key-value-summary) {
  margin: 18px 0 8px;
}
.empty-hint {
  display: grid;
  min-height: 180px;
  place-content: center;
  color: var(--color-text-tertiary);
  text-align: center;
}
html[data-layout='compact'] .department-detail {
  padding: 16px;
}
</style>
