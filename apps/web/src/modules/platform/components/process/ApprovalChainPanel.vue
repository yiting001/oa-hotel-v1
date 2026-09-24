<script setup lang="ts">
import { Delete, Plus, Setting } from '@element-plus/icons-vue';
import { WORKFLOW_ROLE_LABELS } from '@oa/contracts';
import { ElButton, ElIcon, ElMessage, ElOption, ElSelect, ElTag } from 'element-plus';
import { computed, onMounted, ref } from 'vue';
import UiDataList, { type DataColumn } from '../../../../ui/UiDataList.vue';
import UiDialog from '../../../../ui/UiDialog.vue';
import { useLayoutMode } from '../../../../ui/useLayoutMode';
import { useSessionStore } from '../../../../shared/session';
import { approvalChainApi, type ApprovalChainSummary } from '../../api/approval-chain-api';

const session = useSessionStore();
const { isCompact } = useLayoutMode();
const loading = ref(false);
const saving = ref(false);
const chains = ref<ApprovalChainSummary[]>([]);
const editing = ref<ApprovalChainSummary | null>(null);
const editingSteps = ref<string[]>([]);
const columns: DataColumn[] = [
  { key: 'name', label: '单据类型', minWidth: 160 },
  { key: 'documentType', label: '类型编码', minWidth: 200 },
  { key: 'chain', label: '审批链路', minWidth: 280 },
  { key: 'version', label: '版本', width: 80 },
  { key: 'actions', label: '操作', width: 100 },
];

const canManage = computed(() => session.can('PROCESS_DESIGN_MANAGE'));
const roleOptions = computed(() =>
  Object.entries(WORKFLOW_ROLE_LABELS)
    .filter(
      ([code]) => !['APPLICANT', 'DIRECT_USER', 'APPLICANT_DEPARTMENT_MANAGER'].includes(code),
    )
    .map(([code, label]) => ({ code, label })),
);

onMounted(load);

async function load(): Promise<void> {
  loading.value = true;
  try {
    chains.value = await approvalChainApi.list();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '审批链路加载失败');
  } finally {
    loading.value = false;
  }
}

function openEditor(chain: ApprovalChainSummary): void {
  editing.value = chain;
  editingSteps.value = [...chain.steps];
}

function addStep(): void {
  editingSteps.value = [...editingSteps.value, ''];
}

function removeStep(index: number): void {
  editingSteps.value = editingSteps.value.filter((_, i) => i !== index);
}

function moveStep(index: number, offset: number): void {
  const target = index + offset;
  if (target < 0 || target >= editingSteps.value.length) return;
  const next = [...editingSteps.value];
  [next[index], next[target]] = [next[target], next[index]];
  editingSteps.value = next;
}

async function save(): Promise<void> {
  if (!editing.value) return;
  const steps = editingSteps.value.filter((step) => step.length > 0);
  if (steps.length === 0) {
    ElMessage.warning('审批链路至少需要一个审批角色');
    return;
  }
  saving.value = true;
  try {
    const updated = await approvalChainApi.update(editing.value.documentType, steps);
    chains.value = chains.value.map((chain) =>
      chain.documentType === updated.documentType ? updated : chain,
    );
    ElMessage.success('审批链路已更新');
    editing.value = null;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '审批链路保存失败');
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section class="approval-chain-panel">
    <div class="panel-heading">
      <div class="panel-heading__copy">
        <h2>链路快捷配置</h2>
        <p class="ui-text-muted">
          直接编排各单据类型的角色审批顺序，保存后自动发布为新的流程版本；复杂编排请用流程画布。
        </p>
      </div>
    </div>

    <UiDataList
      :columns="columns"
      :loading="loading"
      :rows="chains"
      empty-text="暂无审批链路"
      row-key="code"
    >
      <template #cell-chain="{ row }">
        <div class="chain-steps">
          <ElTag v-for="(label, index) in row.stepLabels" :key="`${row.code}-${index}`">
            {{ index + 1 }}. {{ label }}
          </ElTag>
        </div>
      </template>
      <template v-if="canManage" #actions="{ row }">
        <ElButton link type="primary" @click="openEditor(row)">
          <ElIcon><Setting /></ElIcon>配置
        </ElButton>
      </template>
    </UiDataList>

    <UiDialog
      :model-value="editing !== null"
      :title="`配置审批链路：${editing?.name ?? ''}`"
      :width="560"
      @update:model-value="editing = null"
    >
      <div class="step-list" :data-compact="isCompact">
        <div v-for="(step, index) in editingSteps" :key="index" class="step-row">
          <span class="step-row__index">{{ index + 1 }}</span>
          <ElSelect v-model="editingSteps[index]" filterable placeholder="选择审批角色">
            <ElOption
              v-for="option in roleOptions"
              :key="option.code"
              :label="option.label"
              :value="option.code"
            />
          </ElSelect>
          <div class="step-row__actions">
            <ElButton :disabled="index === 0" size="small" @click="moveStep(index, -1)">上移</ElButton>
            <ElButton
              :disabled="index === editingSteps.length - 1"
              size="small"
              @click="moveStep(index, 1)"
            >
              下移
            </ElButton>
            <ElButton :icon="Delete" size="small" text type="danger" @click="removeStep(index)">
              删除
            </ElButton>
          </div>
        </div>
        <ElButton :icon="Plus" plain type="primary" @click="addStep">添加审批节点</ElButton>
      </div>
      <template #footer>
        <ElButton @click="editing = null">取消</ElButton>
        <ElButton :loading="saving" type="primary" @click="save">保存</ElButton>
      </template>
    </UiDialog>
  </section>
</template>

<style scoped>
.approval-chain-panel {
  min-width: 0;
}
.panel-heading {
  min-width: 0;
  margin-bottom: 16px;
}
.panel-heading h2 {
  margin: 0;
  font-size: var(--font-size-title-md);
  font-weight: 600;
}
.panel-heading p {
  margin: 6px 0 0;
  max-width: 76ch;
  font-size: 13px;
  line-height: 1.6;
}
.chain-steps {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.step-list {
  display: grid;
  gap: 12px;
  min-width: 0;
}
.step-row {
  display: grid;
  min-width: 0;
  align-items: center;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  gap: 8px;
}
.step-row__index {
  color: var(--color-text-tertiary);
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.step-row__actions {
  display: flex;
  align-items: center;
  gap: 4px;
}
.step-list[data-compact='true'] .step-row {
  grid-template-columns: 24px minmax(0, 1fr);
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.step-list[data-compact='true'] .step-row__actions {
  grid-column: 1 / -1;
  flex-wrap: wrap;
}
.step-list[data-compact='true'] :deep(.el-select) {
  width: 100%;
}
html[data-layout='compact'] .step-list {
  padding-bottom: max(0px, env(safe-area-inset-bottom));
}
</style>
