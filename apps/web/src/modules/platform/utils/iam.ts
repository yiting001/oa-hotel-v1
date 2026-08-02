import type { DepartmentNode } from '../types/iam';

export function flattenDepartments(nodes: DepartmentNode[]): DepartmentNode[] {
  return nodes.flatMap((node) => [node, ...flattenDepartments(node.children)]);
}

export function findDepartment(nodes: DepartmentNode[], id: string | null): DepartmentNode | null {
  if (!id) return null;
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findDepartment(node.children, id);
    if (child) return child;
  }
  return null;
}
