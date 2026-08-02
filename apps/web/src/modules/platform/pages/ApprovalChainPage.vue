<script setup lang="ts">
import { WORKFLOW_ROLE_LABELS } from '@oa/contracts';
import { ElMessage } from 'element-plus';
import { computed, onMounted, ref } from 'vue';
import { approvalChainApi, type ApprovalChainSummary } from '../api/approval-chain-api';
import { useSessionStore } from '../../../shared/session';

const session = useSessionStore();
const loading = ref(false);
const saving = ref(false);
const chains = ref<ApprovalChainSummary[]>([]);
const editing = ref<ApprovalChainSummary | null>(null);
const editingSteps = ref<string[]>([]);

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
  <div class="approval-chain-page">
    <el-card shadow="never">
      <template #header>
        <div class="page-header">
          <div>
            <h2>审批链路配置</h2>
            <p class="page-hint">
              配置各类单据提交后的角色审批顺序；发起人提交单据将按此链路逐级流转，支持通过与回退。
            </p>
          </div>
        </div>
      </template>
      <el-table v-loading="loading" :data="chains" row-key="code">
        <el-table-column prop="name" label="单据类型" width="160" />
        <el-table-column prop="documentType" label="类型编码" width="220" />
        <el-table-column label="审批链路">
          <template #default="{ row }">
            <el-space wrap>
              <template v-for="(label, index) in row.stepLabels" :key="index">
                <el-tag>{{ index + 1 }}. {{ label }}</el-tag>
              </template>
            </el-space>
          </template>
        </el-table-column>
        <el-table-column prop="version" label="版本" width="80" />
        <el-table-column v-if="canManage" label="操作" width="100">
          <template #default="{ row }">
            <el-button size="small" type="primary" plain @click="openEditor(row)">配置</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog
      :model-value="editing !== null"
      :title="`配置审批链路：${editing?.name ?? ''}`"
      width="520px"
      @update:model-value="editing = null"
    >
      <div class="step-list">
        <div v-for="(step, index) in editingSteps" :key="index" class="step-row">
          <span class="step-index">{{ index + 1 }}</span>
          <el-select v-model="editingSteps[index]" placeholder="选择审批角色" filterable>
            <el-option
              v-for="option in roleOptions"
              :key="option.code"
              :label="option.label"
              :value="option.code"
            />
          </el-select>
          <el-button-group>
            <el-button size="small" :disabled="index === 0" @click="moveStep(index, -1)"
              >上移</el-button
            >
            <el-button
              size="small"
              :disabled="index === editingSteps.length - 1"
              @click="moveStep(index, 1)"
            >
              下移
            </el-button>
            <el-button size="small" type="danger" plain @click="removeStep(index)">删除</el-button>
          </el-button-group>
        </div>
        <el-button type="primary" plain @click="addStep">添加审批节点</el-button>
      </div>
      <template #footer>
        <el-button @click="editing = null">取消</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.approval-chain-page {
  padding: 16px;
}

.page-header h2 {
  margin: 0;
  font-size: 18px;
}

.page-hint {
  margin: 4px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.step-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.step-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-index {
  width: 20px;
  text-align: right;
  color: var(--el-text-color-secondary);
}
</style>
