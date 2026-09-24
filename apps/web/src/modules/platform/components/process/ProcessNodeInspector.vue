<script setup lang="ts">
import { ArrowDown, ArrowUp, Delete, Plus } from '@element-plus/icons-vue';
import {
  ElAlert,
  ElButton,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElSelect,
  ElTag,
} from 'element-plus';
import { computed } from 'vue';
import { useLayoutMode } from '../../../../ui/useLayoutMode';
import type { IamUser, RoleSummary } from '../../types/iam';
import type { AssigneeRule, ProcessNodeModel, ProcessNodeType } from '../../types/designer';

const props = defineProps<{
  node: ProcessNodeModel | null;
  roles: RoleSummary[];
  users: IamUser[];
  readonly: boolean;
  selectedEdge: { id: string; source: string; target: string } | null;
  chainOrder: ProcessNodeModel[];
  selectedNodeId: string | null;
  reorderable: boolean;
}>();
const emit = defineEmits<{
  update: [node: ProcessNodeModel];
  select: [id: string];
  move: [id: string, direction: -1 | 1];
  remove: [id: string];
  add: [type: ProcessNodeType];
}>();
const { isCompact } = useLayoutMode();

const ruleType = computed({
  get: () => props.node?.assigneeRule?.type ?? 'APPLICANT_DEPARTMENT_MANAGER',
  set: (type: AssigneeRule['type']) => {
    if (!props.node) return;
    const assigneeRule: AssigneeRule =
      type === 'ROLE' ? { type, roleCode: '' } : type === 'USER' ? { type, userId: '' } : { type };
    emit('update', { ...props.node, assigneeRule });
  },
});
const nodeTypeLabels: Record<ProcessNodeType, string> = {
  START: '开始节点',
  USER_TASK: '审批节点',
  END: '结束节点',
};
const nodeTypeShortLabels: Record<ProcessNodeType, string> = {
  START: '开始',
  USER_TASK: '审批',
  END: '结束',
};

function assigneeLabel(node: ProcessNodeModel): string {
  const rule = node.assigneeRule;
  if (!rule) return '未配置办理人';
  if (rule.type === 'APPLICANT_DEPARTMENT_MANAGER') return '发起人部门负责人';
  if (rule.type === 'ROLE') return `角色：${rule.roleCode || '未选择'}`;
  return '指定用户';
}

function updateName(name: string): void {
  if (props.node) emit('update', { ...props.node, name });
}

function updateRole(roleCode: string): void {
  if (props.node) emit('update', { ...props.node, assigneeRule: { type: 'ROLE', roleCode } });
}

function updateUser(userId: string): void {
  if (props.node) emit('update', { ...props.node, assigneeRule: { type: 'USER', userId } });
}
</script>

<template>
  <aside class="process-inspector" :data-compact="isCompact">
    <div class="panel-heading">
      <div class="panel-heading__copy">
        <strong>节点属性</strong>
        <small>配置节点语义和办理人解析规则</small>
      </div>
    </div>

    <section v-if="isCompact" class="node-list" aria-label="流程节点顺序">
      <div class="node-list__actions ui-actions">
        <ElButton :disabled="readonly" size="small" @click="emit('add', 'START')">
          <ElIcon><Plus /></ElIcon>开始
        </ElButton>
        <ElButton :disabled="readonly" size="small" @click="emit('add', 'USER_TASK')">
          <ElIcon><Plus /></ElIcon>审批
        </ElButton>
        <ElButton :disabled="readonly" size="small" @click="emit('add', 'END')">
          <ElIcon><Plus /></ElIcon>结束
        </ElButton>
      </div>
      <ol class="node-list__items">
        <li
          v-for="(item, index) in chainOrder"
          :key="item.id"
          class="node-list__item"
          :class="{ 'is-selected': item.id === selectedNodeId }"
        >
          <button class="node-list__select" type="button" @click="emit('select', item.id)">
            <span class="node-list__index">{{ index + 1 }}</span>
            <span class="node-list__copy">
              <strong>{{ item.name }}</strong>
              <small>{{ nodeTypeShortLabels[item.type] }} · {{ assigneeLabel(item) }}</small>
            </span>
          </button>
          <div class="node-list__controls">
            <ElButton
              circle
              size="small"
              text
              :disabled="readonly || !reorderable || index === 0"
              :aria-label="`上移节点 ${item.name}`"
              @click="emit('move', item.id, -1)"
            >
              <ElIcon><ArrowUp /></ElIcon>
            </ElButton>
            <ElButton
              circle
              size="small"
              text
              :disabled="readonly || !reorderable || index === chainOrder.length - 1"
              :aria-label="`下移节点 ${item.name}`"
              @click="emit('move', item.id, 1)"
            >
              <ElIcon><ArrowDown /></ElIcon>
            </ElButton>
            <ElButton
              circle
              size="small"
              text
              type="danger"
              :disabled="readonly"
              :aria-label="`删除节点 ${item.name}`"
              @click="emit('remove', item.id)"
            >
              <ElIcon><Delete /></ElIcon>
            </ElButton>
          </div>
        </li>
      </ol>
      <p v-if="!reorderable" class="ui-text-muted node-list__hint">
        仅在流程为单链（一个开始、一个结束，且节点全部连通）时可调整顺序。
      </p>
    </section>

    <ElAlert
      v-if="readonly"
      :closable="false"
      show-icon
      title="已发布版本仅供查看，请复制为新草稿后修改。"
      type="info"
    />
    <ElForm v-if="node" label-position="top" :disabled="readonly">
      <ElFormItem label="节点类型">
        <ElTag effect="plain" size="small">{{ nodeTypeLabels[node.type] }}</ElTag>
      </ElFormItem>
      <ElFormItem label="节点名称">
        <ElInput :model-value="node.name" maxlength="80" @update:model-value="updateName" />
      </ElFormItem>
      <template v-if="node.type === 'USER_TASK'">
        <ElFormItem label="办理人规则">
          <ElRadioGroup v-model="ruleType" class="rule-options">
            <ElRadio value="APPLICANT_DEPARTMENT_MANAGER">发起人部门负责人</ElRadio>
            <ElRadio value="ROLE">指定角色</ElRadio>
            <ElRadio value="USER">指定用户</ElRadio>
          </ElRadioGroup>
        </ElFormItem>
        <ElFormItem v-if="ruleType === 'ROLE'" label="角色">
          <ElSelect
            :model-value="node.assigneeRule?.type === 'ROLE' ? node.assigneeRule.roleCode : ''"
            filterable
            placeholder="选择业务角色"
            @update:model-value="updateRole"
          >
            <ElOption
              v-for="role in roles.filter((item) => item.active)"
              :key="role.id"
              :label="`${role.name}（${role.code}）`"
              :value="role.code"
            />
          </ElSelect>
        </ElFormItem>
        <ElFormItem v-if="ruleType === 'USER'" label="指定用户">
          <ElSelect
            :model-value="node.assigneeRule?.type === 'USER' ? node.assigneeRule.userId : ''"
            filterable
            placeholder="选择用户"
            @update:model-value="updateUser"
          >
            <ElOption
              v-for="user in users.filter((item) => item.active)"
              :key="user.id"
              :label="`${user.displayName}（${user.username}）`"
              :value="user.id"
            />
          </ElSelect>
        </ElFormItem>
      </template>
    </ElForm>
    <div v-else-if="selectedEdge" class="edge-summary">
      <strong>已选择连线</strong>
      <span>{{ selectedEdge.source }} → {{ selectedEdge.target }}</span>
      <small>可使用画布工具栏删除此连线。</small>
    </div>
    <p v-else class="empty-hint">在画布中选择节点后编辑属性</p>
  </aside>
</template>

<style scoped>
.process-inspector {
  min-width: 0;
  padding: 18px;
  background: var(--color-canvas);
  border-left: 1px solid var(--color-border);
}
.panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-md);
  margin-bottom: 16px;
}
.panel-heading__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--space-xxs);
}
.panel-heading strong {
  color: var(--color-text);
  font-size: var(--font-size-title-md);
  font-weight: 600;
}
.panel-heading small {
  color: var(--color-text-tertiary);
  font-size: var(--font-size-caption);
  line-height: 1.5;
}
.process-inspector :deep(.el-select) {
  width: 100%;
}
.rule-options {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 8px;
}
.edge-summary {
  display: flex;
  flex-direction: column;
  gap: 7px;
  padding: 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}
.edge-summary span {
  overflow-wrap: anywhere;
  color: var(--color-text-secondary);
  font-size: 12px;
}
.edge-summary small {
  color: var(--color-text-tertiary);
}
.empty-hint {
  display: grid;
  min-height: 160px;
  place-content: center;
  color: var(--color-text-tertiary);
  text-align: center;
}
.node-list {
  min-width: 0;
  margin-bottom: 16px;
}
.node-list__actions {
  margin-bottom: 10px;
}
.node-list__items {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.node-list__item {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
  padding: 8px 8px 8px 12px;
  background: var(--color-canvas);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}
.node-list__item.is-selected {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px var(--focus-ring);
}
.node-list__select {
  display: flex;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
  color: inherit;
  background: transparent;
  border: 0;
  cursor: pointer;
  text-align: left;
}
.node-list__index {
  display: grid;
  flex: 0 0 24px;
  height: 24px;
  place-items: center;
  color: var(--color-text-tertiary);
  background: var(--color-surface-3);
  border-radius: 50%;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.node-list__copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
}
.node-list__copy strong {
  min-width: 0;
  font-size: 14px;
  overflow-wrap: anywhere;
}
.node-list__copy small {
  color: var(--color-text-tertiary);
  font-size: 12px;
}
.node-list__controls {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 2px;
}
.node-list__hint {
  margin: 10px 0 0;
  font-size: 12px;
}
html[data-layout='compact'] .process-inspector {
  padding: 16px;
  border-left: 0;
}
</style>
