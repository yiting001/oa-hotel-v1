<script setup lang="ts">
import LogicFlow, { RectNode, RectNodeModel } from '@logicflow/core';
import '@logicflow/core/lib/style/index.css';
import type { WorkflowOverview } from '@oa/contracts';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { workflowNodeLabel } from '../document';

type EdgeConfig = LogicFlow.EdgeConfig;

const props = defineProps<{
  overview: WorkflowOverview;
  /** 当前用户可办理时传入待办任务 id，当前节点变为可点击进入审批。 */
  actionableTaskId?: string | null;
}>();

const emit = defineEmits<{ act: [taskId: string] }>();

const container = ref<HTMLDivElement | null>(null);
let lf: LogicFlow | null = null;

type NodeStatus = 'done' | 'current' | 'pending' | 'returned';

class ApprovalNodeModel extends RectNodeModel {
  override initNodeData(data: Parameters<RectNodeModel['initNodeData']>[0]): void {
    super.initNodeData(data);
    this.width = 132;
    this.height = 46;
    this.radius = 8;
  }

  override getNodeStyle() {
    const style = super.getNodeStyle();
    const status = this.properties.status as NodeStatus | undefined;
    if (status === 'done') {
      style.fill = '#f0f9eb';
      style.stroke = '#67c23a';
    } else if (status === 'current') {
      style.fill = '#ecf5ff';
      style.stroke = '#409eff';
      style.strokeWidth = 2;
    } else if (status === 'returned') {
      style.fill = '#fef0f0';
      style.stroke = '#f56c6c';
    } else {
      style.fill = '#f4f4f5';
      style.stroke = '#c0c4cc';
    }
    if (this.properties.actionable) {
      style.strokeDasharray = '0';
      style.cursor = 'pointer';
    }
    return style;
  }

  override getTextStyle() {
    const style = super.getTextStyle();
    style.fontSize = 13;
    return style;
  }
}

const currentStep = computed(() => {
  if (props.overview.document.status === 'APPROVED') {
    return props.overview.definition.steps.length;
  }
  return props.overview.document.currentStep ?? 0;
});

interface GraphNode {
  id: string;
  type: string;
  x: number;
  y: number;
  text: string;
  properties: { status: NodeStatus; actionable?: boolean; taskStep?: number };
}

function buildGraph(): { nodes: GraphNode[]; edges: EdgeConfig[] } {
  const steps = props.overview.definition.steps;
  const documentStatus = props.overview.document.status;
  const spacing = 176;
  const y = 70;
  const nodes: GraphNode[] = [
    {
      id: 'node-start',
      type: 'approval-node',
      x: 90,
      y,
      text: documentStatus === 'RETURNED' ? '发起（已退回）' : '发起',
      properties: { status: documentStatus === 'RETURNED' ? 'returned' : 'done' },
    },
    ...steps.map((step, index) => {
      const status: NodeStatus =
        documentStatus === 'APPROVED' || index < currentStep.value
          ? 'done'
          : index === currentStep.value && documentStatus === 'IN_REVIEW'
            ? 'current'
            : 'pending';
      const actionable = status === 'current' && Boolean(props.actionableTaskId);
      return {
        id: `node-step-${index}`,
        type: 'approval-node',
        x: 90 + spacing * (index + 1),
        y,
        text: workflowNodeLabel(step) + (actionable ? '（点击审批）' : ''),
        properties: { status, actionable, taskStep: index },
      };
    }),
    {
      id: 'node-end',
      type: 'approval-node',
      x: 90 + spacing * (steps.length + 1),
      y,
      text: '完成归档',
      properties: { status: documentStatus === 'APPROVED' ? 'done' : 'pending' },
    },
  ];
  const edges: EdgeConfig[] = nodes.slice(0, -1).map((node, index) => ({
    id: `edge-${index}`,
    type: 'polyline',
    sourceNodeId: node.id,
    targetNodeId: nodes[index + 1].id,
  }));
  return { nodes, edges };
}

function render(): void {
  if (!lf) return;
  lf.render(buildGraph());
  lf.translateCenter();
}

onMounted(() => {
  if (!container.value) return;
  lf = new LogicFlow({
    container: container.value,
    isSilentMode: true,
    grid: false,
    background: { backgroundColor: '#fbfcfe' },
  });
  lf.register({ type: 'approval-node', view: RectNode, model: ApprovalNodeModel });
  lf.on('node:click', ({ data }) => {
    const properties = (data?.properties ?? {}) as GraphNode['properties'];
    if (properties.actionable && props.actionableTaskId) {
      emit('act', props.actionableTaskId);
    }
  });
  render();
});

watch(
  () => [props.overview, props.actionableTaskId] as const,
  () => render(),
  { deep: true },
);

onBeforeUnmount(() => {
  lf?.destroy();
  lf = null;
});
</script>

<template>
  <div class="workflow-flow-graph">
    <div ref="container" class="workflow-flow-graph__canvas" />
    <div class="workflow-flow-graph__legend">
      <span><i class="dot dot--done" />已完成</span>
      <span><i class="dot dot--current" />当前节点</span>
      <span><i class="dot dot--pending" />待流转</span>
      <span v-if="actionableTaskId">点击高亮节点可直接审批</span>
    </div>
  </div>
</template>

<style scoped>
.workflow-flow-graph__canvas {
  width: 100%;
  height: 150px;
  border: 1px solid var(--el-border-color-lighter, #e4e7ed);
  border-radius: 8px;
  overflow: hidden;
}

.workflow-flow-graph__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}

.workflow-flow-graph__legend span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  display: inline-block;
}

.dot--done {
  background: #f0f9eb;
  border: 1px solid #67c23a;
}

.dot--current {
  background: #ecf5ff;
  border: 1px solid #409eff;
}

.dot--pending {
  background: #f4f4f5;
  border: 1px solid #c0c4cc;
}
</style>
