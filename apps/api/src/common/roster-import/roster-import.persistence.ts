import type { EntityManager } from 'typeorm';
import { DepartmentEntity } from '../auth/department.entity';
import { UserEntity } from '../auth/user.entity';
import { DepartmentProfileEntity } from '../iam/infrastructure/department-profile.entity';
import { MembershipEntity } from '../iam/infrastructure/membership.entity';
import { PositionEntity } from '../iam/infrastructure/position.entity';
import { UserRoleEntity } from '../iam/infrastructure/user-role.entity';
import type { RosterImportPlan } from './roster-import.plan-types';

export async function persistRosterImportPlan(
  manager: EntityManager,
  plan: RosterImportPlan,
  passwordHashes: ReadonlyMap<string, string>,
): Promise<void> {
  await insertDepartments(manager, plan);
  await insertPositions(manager, plan);
  await saveUsers(manager, plan, passwordHashes);
  await saveMemberships(manager, plan);
  await saveRoleGrants(manager, plan);
  await saveDepartmentManagers(manager, plan);
}

async function insertDepartments(manager: EntityManager, plan: RosterImportPlan): Promise<void> {
  const repository = manager.getRepository(DepartmentEntity);
  const created = plan.departments.filter((item) => item.action === 'CREATE');
  if (created.length > 0) {
    await repository.insert(
      created.map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        managerUserId: null,
      })),
    );
  }

  const missingProfiles = plan.departments.filter(
    (item) => item.action === 'CREATE' || item.profile === null,
  );
  if (missingProfiles.length > 0) {
    await manager.getRepository(DepartmentProfileEntity).insert(
      missingProfiles.map((item) => ({
        departmentId: item.id,
        parentDepartmentId: null,
        sortOrder: item.sortOrder,
        active: true,
      })),
    );
  }
}

async function insertPositions(manager: EntityManager, plan: RosterImportPlan): Promise<void> {
  const created = plan.positions.filter((item) => item.action === 'CREATE');
  if (created.length === 0) return;
  await manager.getRepository(PositionEntity).insert(
    created.map((item) => ({
      id: item.id,
      code: item.code,
      name: item.name,
      departmentId: item.departmentId,
      sortOrder: item.sortOrder,
      active: true,
    })),
  );
}

async function saveUsers(
  manager: EntityManager,
  plan: RosterImportPlan,
  passwordHashes: ReadonlyMap<string, string>,
): Promise<void> {
  const repository = manager.getRepository(UserEntity);
  for (const item of plan.users) {
    if (item.action === 'REUSE') continue;
    const roleCodes = [
      ...new Set([...(item.existing?.roleCodes ?? []), ...item.requiredLegacyRoleCodes]),
    ];
    if (item.action === 'CREATE') {
      const passwordHash = passwordHashes.get(item.id);
      if (!passwordHash) throw new Error('花名册写入缺少新用户密码哈希');
      await repository.insert({
        id: item.id,
        username: item.person.name,
        displayName: item.person.name,
        passwordHash,
        passwordChangeRequired: false,
        credentialVersion: 0,
        passwordChangedAt: null,
        departmentId: item.departmentId,
        roleCodes,
        active: true,
      });
      continue;
    }
    await repository.update(item.id, {
      username: item.person.name,
      displayName: item.person.name,
      departmentId: item.departmentId,
      roleCodes,
    });
  }
}

async function saveMemberships(manager: EntityManager, plan: RosterImportPlan): Promise<void> {
  const repository = manager.getRepository(MembershipEntity);
  for (const item of plan.memberships) {
    if (item.action === 'REUSE') continue;
    const values = {
      userId: item.userId,
      departmentId: item.departmentId,
      positionId: item.positionId,
      isPrimary: true,
      isDepartmentHead: item.isDepartmentHead,
      active: true,
    };
    if (item.action === 'CREATE') await repository.insert({ id: item.id, ...values });
    else await repository.update(item.id, values);
  }
}

async function saveRoleGrants(manager: EntityManager, plan: RosterImportPlan): Promise<void> {
  const repository = manager.getRepository(UserRoleEntity);
  const removals = plan.roleGrants.filter((item) => item.action === 'REMOVE');
  if (removals.length > 0) await repository.delete(removals.map((item) => item.id));
  for (const item of plan.roleGrants) {
    if (item.action === 'REUSE' || item.action === 'REMOVE') continue;
    const values = {
      userId: item.userId,
      roleId: item.roleId,
      dataScope: item.dataScope,
      scopeDepartmentId: item.scopeDepartmentId,
    };
    if (item.action === 'CREATE') await repository.insert({ id: item.id, ...values });
    else await repository.update(item.id, values);
  }
}

async function saveDepartmentManagers(
  manager: EntityManager,
  plan: RosterImportPlan,
): Promise<void> {
  const repository = manager.getRepository(DepartmentEntity);
  for (const item of plan.departmentManagers) {
    if (item.action === 'UPDATE') {
      await repository.update(item.departmentId, { managerUserId: item.managerUserId });
    }
  }
}
