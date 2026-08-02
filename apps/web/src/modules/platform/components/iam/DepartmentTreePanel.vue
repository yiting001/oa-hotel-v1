<script setup lang="ts">
import { Delete, Edit, Plus, Refresh } from '@element-plus/icons-vue';
import {
  ElButton,
  ElDialog,
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
  ElTable,
  ElTableColumn,
  ElTag,
  ElTree,
} from 'element-plus';
import { computed, reactive, ref, watch } from 'vue';
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
const selectedParentName = computed(
  () => findDepartment(props.departments, selectedDepartment.value?.parentId ?? null)?.name ?? '无',
);
const selectedManagerName = computed(
  () =>
    props.users.find((user) => user.id === selectedDepartment.value?.managerUserId)?.displayName ??
    '未设置',
);

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
  <div class="iam-split-panel">
    <aside class="iam-tree-panel">
      <div class="platform-panel-heading">
        <div><strong>组织架构</strong><small>按层级维护部门及负责人</small></div>
        <ElButton circle size="small" title="刷新" @click="emit('refresh')">
          <ElIcon><Refresh /></ElIcon>
        </ElButton>
      </div>
      <div v-if="!readonly" class="iam-tree-actions">
        <ElButton size="small" @click="openDepartment('root')"
          ><ElIcon><Plus /></ElIcon>根部门</ElButton
        >
        <ElButton :disabled="!selectedDepartment" size="small" @click="openDepartment('child')"
          >新增下级</ElButton
        >
      </div>
      <ElTree
        :current-node-key="selectedId ?? undefined"
        :data="departments"
        :expand-on-click-node="false"
        :props="{ label: 'name', children: 'children' }"
        default-expand-all
        highlight-current
        node-key="id"
        @current-change="(node: DepartmentNode) => (selectedId = node.id)"
      >
        <template #default="{ data }">
          <span class="iam-tree-node">
            <span>{{ data.name }}</span>
            <ElTag v-if="!data.active" effect="plain" size="small" type="info">停用</ElTag>
          </span>
        </template>
      </ElTree>
    </aside>

    <section v-loading="loading" class="iam-detail-panel">
      <div v-if="selectedDepartment" class="department-summary">
        <div class="platform-panel-heading">
          <div>
            <strong>{{ selectedDepartment.name }}</strong>
            <small>{{ selectedDepartment.code }} · 排序 {{ selectedDepartment.sortOrder }}</small>
          </div>
          <div class="platform-inline-actions">
            <ElButton v-if="!readonly" @click="openDepartment('edit')"
              ><ElIcon><Edit /></ElIcon>编辑部门</ElButton
            >
            <ElButton v-if="!readonly" type="danger" @click="removeDepartment"
              ><ElIcon><Delete /></ElIcon>删除部门</ElButton
            >
          </div>
        </div>
        <dl class="iam-facts">
          <div>
            <dt>上级部门</dt>
            <dd>{{ selectedParentName }}</dd>
          </div>
          <div>
            <dt>部门负责人</dt>
            <dd>{{ selectedManagerName }}</dd>
          </div>
          <div>
            <dt>状态</dt>
            <dd>{{ selectedDepartment.active ? '正常' : '停用' }}</dd>
          </div>
        </dl>
        <div class="platform-subheading">
          <div><strong>部门岗位</strong><small>岗位用于人员任职和流程办理人解析</small></div>
          <ElButton v-if="!readonly" type="primary" @click="openPosition()"
            ><ElIcon><Plus /></ElIcon>新增岗位</ElButton
          >
        </div>
        <ElTable :data="selectedPositions" empty-text="当前部门暂无岗位" row-key="id">
          <ElTableColumn label="岗位名称" min-width="150" prop="name" />
          <ElTableColumn label="岗位编码" min-width="160" prop="code" />
          <ElTableColumn label="排序" prop="sortOrder" width="90" />
          <ElTableColumn label="状态" width="100">
            <template #default="{ row }"
              ><ElTag :type="row.active ? 'success' : 'info'">{{
                row.active ? '正常' : '停用'
              }}</ElTag></template
            >
          </ElTableColumn>
          <ElTableColumn v-if="!readonly" label="操作" width="130">
            <template #default="{ row }">
              <ElButton link type="primary" @click="openPosition(row)">编辑</ElButton>
              <ElButton link type="danger" @click="removePosition(row)">删除</ElButton>
            </template>
          </ElTableColumn>
        </ElTable>
      </div>
    </section>
  </div>

  <ElDialog
    v-model="departmentDialogOpen"
    :title="editingDepartmentId ? '编辑部门' : '新增部门'"
    width="520px"
  >
    <ElForm label-position="top">
      <div class="platform-form-grid">
        <ElFormItem label="部门名称"
          ><ElInput v-model="departmentForm.name" maxlength="80"
        /></ElFormItem>
        <ElFormItem label="部门编码"
          ><ElInput v-model="departmentForm.code" maxlength="50"
        /></ElFormItem>
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
          <ElSelect
            v-model="departmentForm.managerUserId"
            clearable
            filterable
            placeholder="暂不设置"
          >
            <ElOption
              v-for="user in users"
              :key="user.id"
              :label="`${user.displayName}（${user.username}）`"
              :value="user.id"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem label="排序"
          ><ElInputNumber v-model="departmentForm.sortOrder" :min="0" controls-position="right"
        /></ElFormItem>
        <ElFormItem label="启用状态"
          ><ElSwitch v-model="departmentForm.active" active-text="启用" inactive-text="停用"
        /></ElFormItem>
      </div>
    </ElForm>
    <template #footer
      ><ElButton @click="departmentDialogOpen = false">取消</ElButton
      ><ElButton v-if="!readonly" :loading="saving" type="primary" @click="saveDepartment"
        >保存</ElButton
      ></template
    >
  </ElDialog>

  <ElDialog
    v-model="positionDialogOpen"
    :title="editingPositionId ? '编辑岗位' : '新增岗位'"
    width="480px"
  >
    <ElForm label-position="top">
      <ElFormItem label="岗位名称"
        ><ElInput v-model="positionForm.name" maxlength="80"
      /></ElFormItem>
      <ElFormItem label="岗位编码"
        ><ElInput v-model="positionForm.code" maxlength="50"
      /></ElFormItem>
      <div class="platform-form-grid">
        <ElFormItem label="排序"
          ><ElInputNumber v-model="positionForm.sortOrder" :min="0" controls-position="right"
        /></ElFormItem>
        <ElFormItem label="启用状态"
          ><ElSwitch v-model="positionForm.active" active-text="启用" inactive-text="停用"
        /></ElFormItem>
      </div>
    </ElForm>
    <template #footer
      ><ElButton @click="positionDialogOpen = false">取消</ElButton
      ><ElButton v-if="!readonly" :loading="saving" type="primary" @click="savePosition"
        >保存</ElButton
      ></template
    >
  </ElDialog>
</template>
