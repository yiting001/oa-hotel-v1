import {
  emptyActionCounts,
  type NormalizedRosterPerson,
  type RosterConflict,
} from './roster-import.types';
import type { RosterImportPlan, RosterPlanAction } from './roster-import.plan-types';

export function summarizePlan(
  plan: Omit<RosterImportPlan, 'summary'>,
): RosterImportPlan['summary'] {
  return {
    people: plan.people.length,
    managers: plan.people.filter((person) => person.isDepartmentManager).length,
    departments: countActions(plan.departments),
    positions: countActions(plan.positions),
    users: countActions(plan.users),
    memberships: countActions(plan.memberships),
    roleGrants: countActions(plan.roleGrants),
    departmentManagers: countActions(plan.departmentManagers),
  };
}

export function duplicateKeys<T>(items: T[], keyOf: (item: T) => string): Set<string> {
  const counts = new Map<string, number>();
  for (const item of items) counts.set(keyOf(item), (counts.get(keyOf(item)) ?? 0) + 1);
  return new Set([...counts].filter(([, count]) => count > 1).map(([key]) => key));
}

export function sourcesFor(people: NormalizedRosterPerson[]) {
  return people.map((person) => ({ sheet: person.sourceSheet, sequence: person.sourceSequence }));
}

export function positionKey(department: string, position: string): string {
  return `${department}\u0000${position}`;
}

export function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right, 'zh-CN'));
}

export function sameStringSet(left: string[], right: string[]): boolean {
  return [...new Set(left)].sort().join('\u0000') === [...new Set(right)].sort().join('\u0000');
}

export function rosterConflict(
  code: RosterConflict['code'],
  message: string,
  sources: RosterConflict['sources'] = [],
): RosterConflict {
  return { code, message, sources };
}

function countActions(items: Array<{ action: RosterPlanAction }>) {
  const counts = emptyActionCounts();
  for (const item of items) counts[item.action.toLowerCase() as keyof typeof counts] += 1;
  return counts;
}
