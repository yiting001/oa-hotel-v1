import { DataScope } from '../iam/domain/data-scope';
import type { RoleEntity } from '../iam/infrastructure/role.entity';
import type { UserRoleEntity } from '../iam/infrastructure/user-role.entity';
import { rosterRoleGrantId } from './roster-input';
import type { RosterConflict } from './roster-import.types';
import type { PlannedRoleGrant, PlannedUser } from './roster-import.plan-types';
import { rosterConflict as conflict, sourcesFor } from './roster-import.plan-utils';

export function planRoleGrants(
  users: PlannedUser[],
  roles: Map<string, RoleEntity>,
  existingGrants: UserRoleEntity[],
  conflicts: RosterConflict[],
): PlannedRoleGrant[] {
  const planned: PlannedRoleGrant[] = [];
  const applicantRole = roles.get('APPLICANT');
  const managerRole = roles.get('DEPARTMENT_MANAGER');
  for (const user of users) {
    if (applicantRole) {
      const grant = planRequiredGrant(
        user,
        applicantRole,
        DataScope.SELF,
        null,
        existingGrants,
        conflicts,
      );
      if (grant) planned.push(grant);
    }
    if (user.person.isDepartmentManager && managerRole) {
      const grant = planRequiredGrant(
        user,
        managerRole,
        DataScope.DEPARTMENT,
        user.departmentId,
        existingGrants,
        conflicts,
      );
      if (grant) planned.push(grant);
    } else if (!user.person.isDepartmentManager && managerRole) {
      planManagerGrantRemoval(user, managerRole, existingGrants, conflicts, planned);
    }
  }
  return planned;
}

function planManagerGrantRemoval(
  user: PlannedUser,
  role: RoleEntity,
  grants: UserRoleEntity[],
  conflicts: RosterConflict[],
  planned: PlannedRoleGrant[],
): void {
  const stableId = rosterRoleGrantId(user.id, role.code);
  const existing = grants.find((grant) => grant.id === stableId);
  if (existing && (existing.userId !== user.id || existing.roleId !== role.id)) {
    conflicts.push(
      conflict(
        'ROLE_GRANT_CONFLICT',
        `经理角色稳定 ID 已被其他授权占用：${user.person.name}`,
        sourcesFor([user.person]),
      ),
    );
  } else if (existing) {
    planned.push({ ...existing, action: 'REMOVE', existing });
  }
}

function planRequiredGrant(
  user: PlannedUser,
  role: RoleEntity,
  dataScope: DataScope,
  scopeDepartmentId: string | null,
  grants: UserRoleEntity[],
  conflicts: RosterConflict[],
): PlannedRoleGrant | null {
  const id = rosterRoleGrantId(user.id, role.code);
  const existing = grants.find((grant) => grant.id === id) ?? null;
  const source = sourcesFor([user.person]);
  if (existing && (existing.userId !== user.id || existing.roleId !== role.id)) {
    conflicts.push(
      conflict(
        'ROLE_GRANT_CONFLICT',
        `角色稳定 ID 已被其他授权占用：${user.person.name} / ${role.code}`,
        source,
      ),
    );
    return null;
  }
  const equivalent = grants.find(
    (grant) =>
      grant.id !== id &&
      grant.userId === user.id &&
      grant.roleId === role.id &&
      grant.dataScope === dataScope &&
      grant.scopeDepartmentId === scopeDepartmentId,
  );
  if (!existing && equivalent) return { ...equivalent, action: 'REUSE', existing: equivalent };
  if (existing && equivalent) {
    conflicts.push(
      conflict(
        'ROLE_GRANT_CONFLICT',
        `目标角色授权已由手工记录占用：${user.person.name} / ${role.code}`,
        source,
      ),
    );
    return null;
  }
  const changed =
    Boolean(existing) &&
    (existing?.dataScope !== dataScope || existing.scopeDepartmentId !== scopeDepartmentId);
  return {
    id,
    userId: user.id,
    roleId: role.id,
    dataScope,
    scopeDepartmentId,
    action: existing ? (changed ? 'UPDATE' : 'REUSE') : 'CREATE',
    existing,
  };
}
