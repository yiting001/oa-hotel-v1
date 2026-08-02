import type { AssigneeRule, ProcessDesign, ProcessNodeModel } from '../types/designer';
import { cloneJsonModel } from './json-model';

export function createDefaultProcessDesign(): ProcessDesign {
  const start = createProcessNode('START', 80, 180);
  const task = createProcessNode('USER_TASK', 340, 180);
  const end = createProcessNode('END', 600, 180);
  return {
    schemaVersion: 1,
    nodes: [start, task, end],
    edges: [
      { id: crypto.randomUUID(), source: start.id, target: task.id },
      { id: crypto.randomUUID(), source: task.id, target: end.id },
    ],
    settings: { rejectStrategy: 'RETURN_TO_APPLICANT' },
  };
}

export function createProcessNode(
  type: ProcessNodeModel['type'],
  x: number,
  y: number,
): ProcessNodeModel {
  const names = { START: '发起', USER_TASK: '部门负责人审批', END: '结束' } as const;
  return {
    id: crypto.randomUUID(),
    type,
    name: names[type],
    position: { x, y },
    ...(type === 'USER_TASK'
      ? { assigneeRule: { type: 'APPLICANT_DEPARTMENT_MANAGER' } as AssigneeRule }
      : {}),
  };
}

export function validateProcessDesign(design: ProcessDesign): string[] {
  const errors: string[] = [];
  const starts = design.nodes.filter((node) => node.type === 'START');
  const ends = design.nodes.filter((node) => node.type === 'END');
  const tasks = design.nodes.filter((node) => node.type === 'USER_TASK');
  if (starts.length !== 1) errors.push('流程必须且只能有一个开始节点');
  if (ends.length !== 1) errors.push('流程必须且只能有一个结束节点');
  if (tasks.length === 0) errors.push('流程至少需要一个审批节点');
  if (design.nodes.some((node) => !node.name.trim())) errors.push('所有节点都必须填写名称');
  if (tasks.some((node) => !node.assigneeRule)) errors.push('所有审批节点都必须配置办理人');

  const nodeIds = new Set(design.nodes.map((node) => node.id));
  if (design.edges.some((edge) => !nodeIds.has(edge.source) || !nodeIds.has(edge.target))) {
    errors.push('流程中存在失效连线');
  }
  if (design.edges.some((edge) => edge.source === edge.target)) errors.push('节点不能连接到自身');
  if (design.edges.length !== Math.max(0, design.nodes.length - 1))
    errors.push('当前版本仅支持从开始到结束的单链审批流程');
  if (
    design.nodes.some((node) => {
      const incoming = design.edges.filter((edge) => edge.target === node.id).length;
      const outgoing = design.edges.filter((edge) => edge.source === node.id).length;
      if (node.type === 'START') return incoming !== 0 || outgoing !== 1;
      if (node.type === 'END') return incoming !== 1 || outgoing !== 0;
      return incoming !== 1 || outgoing !== 1;
    })
  )
    errors.push('每个审批节点必须有且只有一个入口和一个出口');
  if (starts[0]) {
    const visited = new Set<string>();
    let currentId: string | undefined = starts[0].id;
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      currentId = design.edges.find((edge) => edge.source === currentId)?.target;
    }
    if (visited.size !== design.nodes.length || !ends[0] || !visited.has(ends[0].id)) {
      errors.push('流程必须形成一条无环、无分支的完整审批链');
    }
  }
  return [...new Set(errors)];
}

export function cloneProcessDesign(design: ProcessDesign): ProcessDesign {
  return cloneJsonModel(design);
}
