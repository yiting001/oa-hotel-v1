import type { EntityManager } from 'typeorm';
import { DepartmentEntity } from '../auth/department.entity';
import { UserEntity } from '../auth/user.entity';
import { DepartmentProfileEntity } from '../iam/infrastructure/department-profile.entity';
import { MembershipEntity } from '../iam/infrastructure/membership.entity';
import { PositionEntity } from '../iam/infrastructure/position.entity';
import { RoleEntity } from '../iam/infrastructure/role.entity';
import { UserRoleEntity } from '../iam/infrastructure/user-role.entity';
import {
  normalizedText,
  rosterDepartmentCode,
  rosterDepartmentId,
  rosterMembershipId,
  rosterPositionCode,
  rosterPositionId,
  rosterUserId,
  type NormalizedRosterInput,
} from './roster-input';
import { type NormalizedRosterPerson, type RosterConflict } from './roster-import.types';
import type {
  PlannedDepartment,
  PlannedDepartmentManager,
  PlannedMembership,
  PlannedPosition,
  PlannedUser,
  RosterImportPlan,
} from './roster-import.plan-types';
import {
  duplicateKeys,
  positionKey,
  rosterConflict as conflict,
  sameStringSet,
  sourcesFor,
  summarizePlan,
  uniqueSorted,
} from './roster-import.plan-utils';
import { planRoleGrants } from './roster-import.role-plan';

export type { RosterImportPlan } from './roster-import.plan-types';

const REQUIRED_ROLE_CODES = ['APPLICANT', 'DEPARTMENT_MANAGER'] as const;

export async function buildRosterImportPlan(
  manager: EntityManager,
  input: NormalizedRosterInput,
): Promise<RosterImportPlan> {
  const state = await loadState(manager);
  const conflicts = [...input.conflicts];
  const people = eligiblePeople(input.people);
  const roles = requiredRoles(state.roles, conflicts);
  const departments = planDepartments(people, state, conflicts);
  const positions = planPositions(people, departments, state, conflicts);
  const ambiguousManagerDepartments = findManagerConflicts(people, conflicts);
  const users = planUsers(people, departments, positions, state, conflicts);
  const memberships = planMemberships(users, state.memberships, conflicts);
  const roleGrants = planRoleGrants(users, roles, state.userRoles, conflicts);
  const departmentManagers = planDepartmentManagers(
    people,
    departments,
    users,
    ambiguousManagerDepartments,
  );
  const plan = {
    people: input.people,
    departments,
    positions,
    users,
    memberships,
    roleGrants,
    departmentManagers,
    conflicts,
  };
  return { ...plan, summary: summarizePlan(plan) };
}

interface RosterDatabaseState {
  departments: DepartmentEntity[];
  profiles: DepartmentProfileEntity[];
  positions: PositionEntity[];
  users: UserEntity[];
  memberships: MembershipEntity[];
  roles: RoleEntity[];
  userRoles: UserRoleEntity[];
}

async function loadState(manager: EntityManager): Promise<RosterDatabaseState> {
  const [departments, profiles, positions, users, memberships, roles, userRoles] =
    await Promise.all([
      manager.getRepository(DepartmentEntity).find(),
      manager.getRepository(DepartmentProfileEntity).find(),
      manager.getRepository(PositionEntity).find(),
      manager.getRepository(UserEntity).find(),
      manager.getRepository(MembershipEntity).find(),
      manager.getRepository(RoleEntity).find(),
      manager.getRepository(UserRoleEntity).find(),
    ]);
  return { departments, profiles, positions, users, memberships, roles, userRoles };
}

function eligiblePeople(people: NormalizedRosterPerson[]): NormalizedRosterPerson[] {
  const duplicateSources = duplicateKeys(people, (person) => person.sourceKey);
  const duplicateNames = duplicateKeys(people, (person) => person.name);
  return people.filter(
    (person) => !duplicateSources.has(person.sourceKey) && !duplicateNames.has(person.name),
  );
}

function requiredRoles(roles: RoleEntity[], conflicts: RosterConflict[]): Map<string, RoleEntity> {
  const result = new Map<string, RoleEntity>();
  for (const code of REQUIRED_ROLE_CODES) {
    const role = roles.find((candidate) => candidate.code === code && candidate.active);
    if (role) result.set(code, role);
    else conflicts.push(conflict('ROLE_MISSING', `缺少启用的 ${code} 角色`));
  }
  return result;
}

function planDepartments(
  people: NormalizedRosterPerson[],
  state: RosterDatabaseState,
  conflicts: RosterConflict[],
): PlannedDepartment[] {
  const profileByDepartment = new Map(
    state.profiles.map((profile) => [profile.departmentId, profile]),
  );
  return uniqueSorted(people.map((person) => person.department)).flatMap<PlannedDepartment>(
    (name, index) => {
      const sources = sourcesFor(people.filter((person) => person.department === name));
      const matches = state.departments.filter((item) => normalizedText(item.name) === name);
      if (matches.length > 1) {
        conflicts.push(
          conflict('DEPARTMENT_AMBIGUOUS', `数据库中存在多个同名部门：${name}`, sources),
        );
        return [];
      }
      if (matches[0]) {
        const profile = profileByDepartment.get(matches[0].id) ?? null;
        if (profile && !profile.active) {
          conflicts.push(conflict('DEPARTMENT_INACTIVE', `部门已停用：${name}`, sources));
          return [];
        }
        return [
          {
            id: matches[0].id,
            code: matches[0].code,
            name,
            sortOrder: profile?.sortOrder ?? index,
            action: 'REUSE' as const,
            existing: matches[0],
            profile,
          },
        ];
      }

      const id = rosterDepartmentId(name);
      const code = rosterDepartmentCode(name);
      if (state.departments.some((item) => item.id === id)) {
        conflicts.push(
          conflict('DEPARTMENT_ID_COLLISION', `部门稳定 ID 已被其他记录占用：${name}`, sources),
        );
        return [];
      }
      if (state.departments.some((item) => normalizedText(item.code) === code)) {
        conflicts.push(
          conflict('DEPARTMENT_CODE_COLLISION', `部门稳定编码已被占用：${name}`, sources),
        );
        return [];
      }
      return [
        {
          id,
          code,
          name,
          sortOrder: index,
          action: 'CREATE' as const,
          existing: null,
          profile: null,
        },
      ];
    },
  );
}

function planPositions(
  people: NormalizedRosterPerson[],
  departments: PlannedDepartment[],
  state: RosterDatabaseState,
  conflicts: RosterConflict[],
): PlannedPosition[] {
  const departmentByName = new Map(departments.map((department) => [department.name, department]));
  const keys = uniqueSorted(
    people.map((person) => positionKey(person.department, person.position)),
  );
  return keys.flatMap<PlannedPosition>((key, index) => {
    const [departmentName = '', name = ''] = key.split('\u0000');
    const department = departmentByName.get(departmentName);
    if (!department) return [];
    const related = people.filter(
      (person) => person.department === departmentName && person.position === name,
    );
    const sources = sourcesFor(related);
    const matches = state.positions.filter(
      (item) => item.departmentId === department.id && normalizedText(item.name) === name,
    );
    if (matches.length > 1) {
      conflicts.push(
        conflict('POSITION_AMBIGUOUS', `部门“${departmentName}”存在多个同名岗位：${name}`, sources),
      );
      return [];
    }
    if (matches[0]) {
      if (!matches[0].active) {
        conflicts.push(
          conflict('POSITION_INACTIVE', `岗位已停用：${departmentName} / ${name}`, sources),
        );
        return [];
      }
      return [
        {
          id: matches[0].id,
          code: matches[0].code,
          name,
          departmentId: department.id,
          sortOrder: matches[0].sortOrder,
          action: 'REUSE' as const,
          existing: matches[0],
        },
      ];
    }

    const id = rosterPositionId(departmentName, name);
    const code = rosterPositionCode(departmentName, name);
    if (state.positions.some((item) => item.id === id)) {
      conflicts.push(
        conflict(
          'POSITION_ID_COLLISION',
          `岗位稳定 ID 已被其他记录占用：${departmentName} / ${name}`,
          sources,
        ),
      );
      return [];
    }
    if (state.positions.some((item) => normalizedText(item.code) === code)) {
      conflicts.push(
        conflict(
          'POSITION_CODE_COLLISION',
          `岗位稳定编码已被占用：${departmentName} / ${name}`,
          sources,
        ),
      );
      return [];
    }
    return [
      {
        id,
        code,
        name,
        departmentId: department.id,
        sortOrder: index,
        action: 'CREATE' as const,
        existing: null,
      },
    ];
  });
}

function findManagerConflicts(
  people: NormalizedRosterPerson[],
  conflicts: RosterConflict[],
): Set<string> {
  const ambiguous = new Set<string>();
  for (const department of uniqueSorted(people.map((person) => person.department))) {
    const managers = people.filter(
      (person) => person.department === department && person.isDepartmentManager,
    );
    if (managers.length <= 1) continue;
    ambiguous.add(department);
    conflicts.push(
      conflict('MANAGER_AMBIGUOUS', `部门“${department}”识别到多个经理`, sourcesFor(managers)),
    );
  }
  return ambiguous;
}

function planUsers(
  people: NormalizedRosterPerson[],
  departments: PlannedDepartment[],
  positions: PlannedPosition[],
  state: RosterDatabaseState,
  conflicts: RosterConflict[],
): PlannedUser[] {
  const departmentByName = new Map(departments.map((item) => [item.name, item]));
  const positionByKey = new Map(
    positions.map((item) => {
      const department = departments.find((candidate) => candidate.id === item.departmentId);
      return [positionKey(department?.name ?? '', item.name), item] as const;
    }),
  );
  return people.flatMap((person) => {
    const department = departmentByName.get(person.department);
    const position = positionByKey.get(positionKey(person.department, person.position));
    if (!department || !position) return [];
    const id = rosterUserId(person.name);
    const byId = state.users.find((user) => user.id === id) ?? null;
    const byUsername = state.users.filter((user) => normalizedText(user.username) === person.name);
    const sources = sourcesFor([person]);
    if (byId && normalizedText(byId.username) !== person.name) {
      conflicts.push(
        conflict('USER_ID_COLLISION', `人员稳定 ID 已被其他账号占用：${person.name}`, sources),
      );
      return [];
    }
    if (byUsername.some((user) => user.id !== id)) {
      conflicts.push(
        conflict('USERNAME_CONFLICT', `姓名账号已由非花名册用户占用：${person.name}`, sources),
      );
      return [];
    }
    if (byId && !byId.active) {
      conflicts.push(
        conflict('USER_INACTIVE', `花名册用户已被管理员停用：${person.name}`, sources),
      );
      return [];
    }
    const requiredLegacyRoleCodes = [
      'APPLICANT',
      ...(person.isDepartmentManager ? ['DEPARTMENT_MANAGER'] : []),
    ];
    const expectedRoleCodes = [
      ...new Set([...(byId?.roleCodes ?? []), ...requiredLegacyRoleCodes]),
    ];
    const changed =
      Boolean(byId) &&
      (byId?.username !== person.name ||
        byId.displayName !== person.name ||
        byId.departmentId !== department.id ||
        !sameStringSet(byId.roleCodes, expectedRoleCodes));
    return [
      {
        id,
        person,
        departmentId: department.id,
        positionId: position.id,
        requiredLegacyRoleCodes,
        action: byId ? (changed ? 'UPDATE' : 'REUSE') : 'CREATE',
        existing: byId,
      },
    ];
  });
}

function planMemberships(
  users: PlannedUser[],
  memberships: MembershipEntity[],
  conflicts: RosterConflict[],
): PlannedMembership[] {
  return users.flatMap((user) => {
    const id = rosterMembershipId(user.id);
    const existing = memberships.find((membership) => membership.id === id) ?? null;
    const userMemberships = memberships.filter((membership) => membership.userId === user.id);
    const sources = sourcesFor([user.person]);
    if (existing && existing.userId !== user.id) {
      conflicts.push(
        conflict(
          'MEMBERSHIP_CONFLICT',
          `主任职稳定 ID 已被其他用户占用：${user.person.name}`,
          sources,
        ),
      );
      return [];
    }
    if (userMemberships.some((item) => item.id !== id && item.active && item.isPrimary)) {
      conflicts.push(
        conflict(
          'MEMBERSHIP_CONFLICT',
          `用户已有手工主任职，导入器不会覆盖：${user.person.name}`,
          sources,
        ),
      );
      return [];
    }
    const duplicateTarget = userMemberships.some(
      (item) =>
        item.id !== id &&
        item.departmentId === user.departmentId &&
        item.positionId === user.positionId,
    );
    if (duplicateTarget) {
      conflicts.push(
        conflict(
          'MEMBERSHIP_CONFLICT',
          `用户已有同部门岗位的手工任职：${user.person.name}`,
          sources,
        ),
      );
      return [];
    }
    const changed =
      Boolean(existing) &&
      (existing?.departmentId !== user.departmentId ||
        existing.positionId !== user.positionId ||
        !existing.isPrimary ||
        existing.isDepartmentHead !== user.person.isDepartmentManager ||
        !existing.active);
    return [
      {
        id,
        userId: user.id,
        departmentId: user.departmentId,
        positionId: user.positionId,
        isDepartmentHead: user.person.isDepartmentManager,
        action: existing ? (changed ? 'UPDATE' : 'REUSE') : 'CREATE',
        existing,
      },
    ];
  });
}

function planDepartmentManagers(
  people: NormalizedRosterPerson[],
  departments: PlannedDepartment[],
  users: PlannedUser[],
  ambiguousDepartments: Set<string>,
): PlannedDepartmentManager[] {
  const userByName = new Map(users.map((user) => [user.person.name, user]));
  const importedUserIds = new Set(users.map((user) => user.id));
  return departments.flatMap<PlannedDepartmentManager>((department) => {
    if (ambiguousDepartments.has(department.name)) return [];
    const manager = people.find(
      (person) => person.department === department.name && person.isDepartmentManager,
    );
    const plannedManagerId = manager ? userByName.get(manager.name)?.id : undefined;
    const currentManagerId = department.existing?.managerUserId ?? null;
    if (plannedManagerId) {
      return [
        {
          departmentId: department.id,
          managerUserId: plannedManagerId,
          action: currentManagerId === plannedManagerId ? ('REUSE' as const) : ('UPDATE' as const),
        },
      ];
    }
    if (currentManagerId && importedUserIds.has(currentManagerId)) {
      return [{ departmentId: department.id, managerUserId: null, action: 'UPDATE' as const }];
    }
    return [
      { departmentId: department.id, managerUserId: currentManagerId, action: 'REUSE' as const },
    ];
  });
}
