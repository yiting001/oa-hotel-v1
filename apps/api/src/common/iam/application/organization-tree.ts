import type { DepartmentEntity } from '../../auth/department.entity';
import type { DepartmentProfileEntity } from '../infrastructure/department-profile.entity';
import type { DepartmentNode } from './iam.models';

export function buildDepartmentTree(
  departments: DepartmentEntity[],
  profiles: DepartmentProfileEntity[],
): DepartmentNode[] {
  const profileByDepartment = new Map(profiles.map((profile) => [profile.departmentId, profile]));
  const nodes = new Map<string, DepartmentNode>(
    departments.map((department) => {
      const profile = profileByDepartment.get(department.id);
      return [
        department.id,
        {
          id: department.id,
          code: department.code,
          name: department.name,
          managerUserId: department.managerUserId,
          parentId: profile?.parentDepartmentId ?? null,
          sortOrder: profile?.sortOrder ?? 0,
          active: profile?.active ?? true,
          children: [] as DepartmentNode[],
        } satisfies DepartmentNode,
      ] as const;
    }),
  );

  const roots: DepartmentNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent && !createsCycle(node, parent, nodes)) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }
  sortNodes(roots);
  return roots;
}

function createsCycle(
  node: DepartmentNode,
  parent: DepartmentNode,
  nodes: Map<string, DepartmentNode>,
): boolean {
  const visited = new Set([node.id]);
  let current: DepartmentNode | undefined = parent;
  while (current) {
    if (visited.has(current.id)) {
      return true;
    }
    visited.add(current.id);
    current = current.parentId ? nodes.get(current.parentId) : undefined;
  }
  return false;
}

function sortNodes(nodes: DepartmentNode[]): void {
  nodes.sort(
    (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name),
  );
  nodes.forEach((node) => sortNodes(node.children));
}

export function collectDepartmentDescendants(
  rootDepartmentId: string,
  profiles: DepartmentProfileEntity[],
): Set<string> {
  const children = new Map<string, string[]>();
  for (const profile of profiles) {
    if (!profile.parentDepartmentId) continue;
    const siblings = children.get(profile.parentDepartmentId) ?? [];
    siblings.push(profile.departmentId);
    children.set(profile.parentDepartmentId, siblings);
  }

  const result = new Set<string>();
  const pending = [rootDepartmentId];
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current || result.has(current)) continue;
    result.add(current);
    pending.push(...(children.get(current) ?? []));
  }
  return result;
}
