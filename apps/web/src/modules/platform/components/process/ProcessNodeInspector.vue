<script setup lang="ts">
import {
  ElAlert,
  ElForm,
  ElFormItem,
  ElInput,
  ElOption,
  ElRadio,
  ElRadioGroup,
  ElSelect,
} from 'element-plus';
import { computed } from 'vue';
import type { IamUser, RoleSummary } from '../../types/iam';
import type { AssigneeRule, ProcessNodeModel } from '../../types/designer';

const props = defineProps<{
  node: ProcessNodeModel | null;
  roles: RoleSummary[];
  users: IamUser[];
  readonly: boolean;
  selectedEdge: { id: string; source: string; target: string } | null;
}>();
const emit = defineEmits<{ update: [node: ProcessNodeModel] }>();

const ruleType = computed({
  get: () => props.node?.assigneeRule?.type ?? 'APPLICANT_DEPARTMENT_MANAGER',
  set: (type: AssigneeRule['type']) => {
    if (!props.node) return;
    const assigneeRule: AssigneeRule =
      type === 'ROLE' ? { type, roleCode: '' } : type === 'USER' ? { type, userId: '' } : { type };
    emit('update', { ...props.node, assigneeRule });
  },
});

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
  <aside class="process-inspector">
    <div class="platform-panel-heading">
      <div><strong>节点属性</strong><small>配置节点语义和办理人解析规则</small></div>
    </div>
    <ElAlert
      v-if="readonly"
      :closable="false"
      show-icon
      title="已发布版本仅供查看，请复制为新草稿后修改。"
      type="info"
    />
    <ElForm v-if="node" label-position="top" :disabled="readonly">
      <ElFormItem label="节点类型">
        <ElInput
          :model-value="{ START: '开始节点', USER_TASK: '审批节点', END: '结束节点' }[node.type]"
          disabled
        />
      </ElFormItem>
      <ElFormItem label="节点名称"
        ><ElInput :model-value="node.name" maxlength="80" @update:model-value="updateName"
      /></ElFormItem>
      <template v-if="node.type === 'USER_TASK'">
        <ElFormItem label="办理人规则">
          <ElRadioGroup v-model="ruleType" class="process-rule-options">
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
    <div v-else-if="selectedEdge" class="process-edge-summary">
      <strong>已选择连线</strong>
      <span>{{ selectedEdge.source }} → {{ selectedEdge.target }}</span>
      <small>可使用画布工具栏删除此连线。</small>
    </div>
    <div v-else class="platform-empty-hint">在画布中选择节点后编辑属性</div>
  </aside>
</template>
