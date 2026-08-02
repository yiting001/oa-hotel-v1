<script setup lang="ts">
import { VueFlow, type Connection, type Edge, type Node, useVueFlow } from '@vue-flow/core';
import { computed, nextTick, watch } from 'vue';
import type { ProcessDesign, ProcessNodeModel } from '../../types/designer';
import ProcessFlowNode from './ProcessFlowNode.vue';

const props = defineProps<{
  design: ProcessDesign;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  readonly: boolean;
}>();
const emit = defineEmits<{
  update: [design: ProcessDesign];
  selectNode: [id: string | null];
  selectEdge: [id: string | null];
}>();
const flowId = crypto.randomUUID();
const flow = useVueFlow(flowId);

const flowNodes = computed<Node[]>(() =>
  props.design.nodes.map((node) => ({
    id: node.id,
    type: 'process',
    position: node.position,
    selected: node.id === props.selectedNodeId,
    data: {
      nodeType: node.type,
      name: node.name,
      assignee: assigneeLabel(node),
    },
  })),
);
const flowEdges = computed<Edge[]>(() =>
  props.design.edges.map((edge) => ({
    ...edge,
    selected: edge.id === props.selectedEdgeId,
    animated: edge.id === props.selectedEdgeId,
  })),
);

watch(
  () => props.design.nodes.map((node) => node.id).join('|'),
  () => void fitDesign(),
  { flush: 'post' },
);

async function fitDesign(): Promise<void> {
  await nextTick();
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await flow.fitView({ padding: 0.28, maxZoom: 1 });
}

function assigneeLabel(node: ProcessNodeModel): string {
  const rule = node.assigneeRule;
  if (!rule) return '未配置办理人';
  if (rule.type === 'APPLICANT_DEPARTMENT_MANAGER') return '发起人部门负责人';
  if (rule.type === 'ROLE') return `角色：${rule.roleCode || '未选择'}`;
  return '指定用户';
}

function connect(connection: Connection): void {
  if (props.readonly || !connection.source || !connection.target) return;
  if (
    props.design.edges.some(
      (edge) => edge.source === connection.source && edge.target === connection.target,
    )
  )
    return;
  emit('update', {
    ...props.design,
    edges: [
      ...props.design.edges,
      { id: crypto.randomUUID(), source: connection.source, target: connection.target },
    ],
  });
}

function nodeDragStop(event: { node: Node }): void {
  if (props.readonly) return;
  emit('update', {
    ...props.design,
    nodes: props.design.nodes.map((node) =>
      node.id === event.node.id ? { ...node, position: { ...event.node.position } } : node,
    ),
  });
}

function selectEdge(event: { edge: Edge }): void {
  emit('selectEdge', event.edge.id);
  emit('selectNode', null);
}

function selectNode(event: { node: Node }): void {
  emit('selectNode', event.node.id);
  emit('selectEdge', null);
}

function clearSelection(): void {
  emit('selectNode', null);
  emit('selectEdge', null);
}
</script>

<template>
  <div class="process-canvas" :class="{ 'is-readonly': readonly }">
    <VueFlow
      :id="flowId"
      :edges="flowEdges"
      :fit-view-on-init="true"
      :min-zoom="0.35"
      :max-zoom="1.8"
      :nodes="flowNodes"
      :nodes-connectable="!readonly"
      :nodes-draggable="!readonly"
      @connect="connect"
      @edge-click="selectEdge"
      @node-click="selectNode"
      @node-drag-stop="nodeDragStop"
      @pane-click="clearSelection"
      @nodes-initialized="fitDesign"
      @pane-ready="fitDesign"
    >
      <template #node-process="slotProps">
        <ProcessFlowNode :data="slotProps.data" :selected="slotProps.selected" />
      </template>
    </VueFlow>
  </div>
</template>
