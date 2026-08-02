import { DomainError } from '../../errors/domain-error';
import type {
  ProcessVersion,
  PublishedAssigneeRule,
  PublishedUserTask,
} from './process-design.types';

const publishableNodeTypes = new Set(['START', 'USER_TASK', 'END']);

/** Published and retired process versions remain immutable for audit replay. */
export function assertProcessVersionEditable(version: ProcessVersion): void {
  if (version.status !== 'DRAFT') {
    throw new DomainError('PROCESS_VERSION_IMMUTABLE', '已发布或已退役的流程版本不可修改');
  }
}

/** Validates the executable subset: Start -> one or more UserTask -> End. */
export function validateProcessForPublishing(version: ProcessVersion): void {
  parsePublishedUserTasks(version.designJson);
}

/** Converts a validated published design into runtime tasks in execution order. */
export function parsePublishedUserTasks(designJson: Record<string, unknown>): PublishedUserTask[] {
  const rawNodes = designJson.nodes;
  const rawEdges = designJson.edges;
  if (!Array.isArray(rawNodes) || !Array.isArray(rawEdges)) {
    invalid('流程设计必须包含 nodes 和 edges 数组');
  }

  const nodes = rawNodes.map((node) => parseNode(node));
  const edges = rawEdges.map((edge) => parseEdge(edge));
  const nodeIds = new Set(nodes.map((node) => node.id));
  if (nodeIds.size !== nodes.length) {
    invalid('流程节点 ID 不能重复');
  }
  if (edges.some((edge) => !nodeIds.has(edge.source) || !nodeIds.has(edge.target))) {
    invalid('流程连线引用了不存在的节点');
  }

  const starts = nodes.filter((node) => node.type === 'START');
  const ends = nodes.filter((node) => node.type === 'END');
  const tasks = nodes.filter((node) => node.type === 'USER_TASK');
  if (starts.length !== 1 || ends.length !== 1 || tasks.length === 0) {
    invalid('流程必须包含一个开始节点、至少一个审批节点和一个结束节点');
  }
  if (nodes.some((node) => !publishableNodeTypes.has(node.type))) {
    throw new DomainError(
      'PROCESS_NODE_NOT_SUPPORTED',
      '当前版本仅支持发布线性审批流程，网关、会签等节点尚不可发布',
    );
  }
  const order = assertLinearChain(nodes, edges, starts[0].id, ends[0].id);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  return order.slice(1, -1).map((nodeId) => {
    const node = byId.get(nodeId);
    if (!node || node.type !== 'USER_TASK') {
      invalid('开始和结束节点之间只能包含审批节点');
    }
    return {
      id: node.id,
      name: node.name,
      assigneeRule: parseAssigneeRule(node),
    };
  });
}

interface ParsedNode {
  id: string;
  name: string;
  type: string;
  assigneeRule: Record<string, unknown> | null;
}

interface ParsedEdge {
  source: string;
  target: string;
}

function parseNode(value: unknown): ParsedNode {
  if (!isRecord(value) || !text(value.id) || !text(value.type) || !text(value.name)) {
    invalid('每个流程节点都必须包含 id、type 和 name');
  }
  return {
    id: value.id as string,
    name: value.name as string,
    type: value.type as string,
    assigneeRule: isRecord(value.assigneeRule) ? value.assigneeRule : null,
  };
}

function parseEdge(value: unknown): ParsedEdge {
  if (!isRecord(value) || !text(value.source) || !text(value.target)) {
    invalid('每条流程连线都必须包含 source 和 target');
  }
  return { source: value.source as string, target: value.target as string };
}

function parseAssigneeRule(node: ParsedNode): PublishedAssigneeRule {
  const rule = node.assigneeRule;
  if (!rule || !text(rule.type)) {
    invalid('每个审批节点都必须配置办理人规则');
  }
  if (rule.type === 'APPLICANT_DEPARTMENT_MANAGER') {
    return { type: 'APPLICANT_DEPARTMENT_MANAGER' };
  }
  if (rule.type === 'ROLE' && text(rule.roleCode)) {
    return { type: 'ROLE', roleCode: rule.roleCode };
  }
  if (rule.type === 'USER' && text(rule.userId)) {
    return { type: 'USER', userId: rule.userId };
  }
  return invalid('办理人规则仅支持申请人部门负责人、角色或指定用户');
}

function assertLinearChain(
  nodes: ParsedNode[],
  edges: ParsedEdge[],
  startId: string,
  endId: string,
): string[] {
  if (edges.length !== nodes.length - 1) {
    invalid('线性流程的连线数量必须等于节点数量减一');
  }
  const incoming = new Map(nodes.map((node) => [node.id, 0]));
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]);
  }
  for (const node of nodes) {
    const inCount = incoming.get(node.id) ?? 0;
    const outCount = outgoing.get(node.id)?.length ?? 0;
    const validDegree =
      (node.id === startId && inCount === 0 && outCount === 1) ||
      (node.id === endId && inCount === 1 && outCount === 0) ||
      (node.type === 'USER_TASK' && inCount === 1 && outCount === 1);
    if (!validDegree) {
      invalid('当前只允许无分支、无回路的线性审批流程');
    }
  }

  const visited = new Set<string>();
  const order: string[] = [];
  let cursor = startId;
  while (!visited.has(cursor)) {
    visited.add(cursor);
    order.push(cursor);
    const next = outgoing.get(cursor)?.[0];
    if (!next) {
      break;
    }
    cursor = next;
  }
  if (cursor !== endId || visited.size !== nodes.length) {
    invalid('流程必须从开始节点连续到达结束节点，且不能包含孤立节点或回路');
  }
  return order;
}

function invalid(message: string): never {
  throw new DomainError('PROCESS_DESIGN_INVALID', message);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
