import { hash, verify } from 'argon2';
import { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { DepartmentEntity } from '../auth/department.entity';
import { credentialPolicy } from '../auth/credential-policy';
import { UserEntity } from '../auth/user.entity';
import { createDatabaseOptions } from '../database/database-options';
import { DataScope } from '../iam/domain/data-scope';
import { MembershipEntity } from '../iam/infrastructure/membership.entity';
import { RoleEntity } from '../iam/infrastructure/role.entity';
import { UserRoleEntity } from '../iam/infrastructure/user-role.entity';
import { rosterMembershipId, rosterUserId } from './roster-input';
import { RosterImportService } from './roster-import.service';
import { RosterImportConflictError } from './roster-import.types';

describe('RosterImportService', () => {
  let dataSource: DataSource;
  let service: RosterImportService;

  beforeEach(async () => {
    process.env.OA_DATABASE_PATH = ':memory:';
    dataSource = new DataSource(createDatabaseOptions());
    await dataSource.initialize();
    service = new RosterImportService(dataSource);
  });

  afterEach(async () => {
    await dataSource.destroy();
  });

  it('previews without writing and normalizes trimmed NFC text', async () => {
    const report = await service.preview({
      people: [person(' 人员信息 ', 2, ' 客房部 ', ' 服务员 ', ' 张\u4e09 ')],
    });

    expect(report).toMatchObject({
      mode: 'DRY_RUN',
      applied: false,
      summary: {
        people: 1,
        departments: { create: 1 },
        positions: { create: 1 },
        users: { create: 1 },
      },
      conflicts: [],
    });
    expect(await dataSource.getRepository(UserEntity).count()).toBe(0);
    expect(await dataSource.getRepository(DepartmentEntity).count()).toBe(0);
  });

  it('creates organization and independently salted optional-change credentials', async () => {
    const input = {
      people: [
        person('花名册', 2, '客房部', '服务员', '张三'),
        person('花名册', 3, '客房部', '客房部经理', '李四'),
      ],
    };

    const report = await service.apply(input, '000000');
    const users = await dataSource.getRepository(UserEntity).find({ order: { username: 'ASC' } });
    const department = await dataSource.getRepository(DepartmentEntity).findOneByOrFail({
      name: '客房部',
    });
    const memberships = await dataSource.getRepository(MembershipEntity).find();
    const roles = await dataSource.getRepository(RoleEntity).find();
    const grants = await dataSource.getRepository(UserRoleEntity).find();

    expect(report.applied).toBe(true);
    expect(users).toHaveLength(2);
    expect(users[0]?.passwordHash).not.toBe(users[1]?.passwordHash);
    expect(await Promise.all(users.map((user) => verify(user.passwordHash, '000000')))).toEqual([
      true,
      true,
    ]);
    expect(users.every((user) => user.passwordChangeRequired === false)).toBe(true);
    expect(users.every((user) => user.passwordChangedAt === null)).toBe(true);
    expect(users.every((user) => user.credentialVersion === 0)).toBe(true);
    expect(department.managerUserId).toBe(rosterUserId('李四'));
    expect(memberships.find((item) => item.userId === rosterUserId('李四'))).toMatchObject({
      isPrimary: true,
      isDepartmentHead: true,
    });
    expect(grants.filter((grant) => grant.roleId === roleId(roles, 'APPLICANT'))).toHaveLength(2);
    expect(
      grants.find((grant) => grant.roleId === roleId(roles, 'DEPARTMENT_MANAGER')),
    ).toMatchObject({ dataScope: DataScope.DEPARTMENT, scopeDepartmentId: department.id });
  });

  it('updates only roster-owned organization records and never resets credentials or manual grants', async () => {
    const initial = {
      people: [
        person('花名册', 2, '客房部', '服务员', '张三'),
        person('花名册', 3, '财务部', '会计', '李四'),
      ],
    };
    await service.apply(initial, '000000');
    const userId = rosterUserId('张三');
    const changedHash = await hash('Changed123!');
    await dataSource.getRepository(UserEntity).update(userId, {
      passwordHash: changedHash,
      passwordChangeRequired: false,
      credentialVersion: 1,
      passwordChangedAt: new Date('2026-07-21T00:00:00.000Z'),
    });
    const finance = await dataSource
      .getRepository(DepartmentEntity)
      .findOneByOrFail({ name: '财务部' });
    await dataSource.getRepository(MembershipEntity).insert({
      id: 'manual-secondary-membership',
      userId,
      departmentId: finance.id,
      positionId: null,
      isPrimary: false,
      isDepartmentHead: false,
      active: true,
    });
    const systemAdmin = await dataSource
      .getRepository(RoleEntity)
      .findOneByOrFail({ code: 'SYSTEM_ADMIN' });
    await dataSource.getRepository(UserRoleEntity).insert({
      id: 'manual-system-admin-grant',
      userId,
      roleId: systemAdmin.id,
      dataScope: DataScope.ALL,
      scopeDepartmentId: null,
    });

    const moved = {
      people: [
        person('花名册', 2, '财务部', '出纳', '张三'),
        person('花名册', 3, '财务部', '会计', '李四'),
      ],
    };
    await service.apply(moved, '000000');
    const second = await service.apply(moved, '000000');
    const user = await dataSource.getRepository(UserEntity).findOneByOrFail({ id: userId });
    const stableMembership = await dataSource.getRepository(MembershipEntity).findOneByOrFail({
      id: rosterMembershipId(userId),
    });

    expect(await verify(user.passwordHash, 'Changed123!')).toBe(true);
    expect(await verify(user.passwordHash, '000000')).toBe(false);
    expect(user).toMatchObject({ passwordChangeRequired: false, credentialVersion: 1 });
    expect(stableMembership.departmentId).toBe(finance.id);
    expect(
      await dataSource.getRepository(MembershipEntity).exist({
        where: { id: 'manual-secondary-membership' },
      }),
    ).toBe(true);
    expect(
      await dataSource.getRepository(UserRoleEntity).exist({
        where: { id: 'manual-system-admin-grant' },
      }),
    ).toBe(true);
    expect(second.summary.users.reuse).toBe(2);
    expect(second.summary.memberships.reuse).toBe(2);
  });

  it('rejects all writes when any name conflicts with a non-roster account', async () => {
    const department = await seedManualDepartment();
    await dataSource.getRepository(UserEntity).insert({
      id: 'manual-user',
      username: '张三',
      displayName: '张三',
      passwordHash: await hash('Existing123!'),
      passwordChangeRequired: false,
      credentialVersion: 0,
      passwordChangedAt: new Date(),
      departmentId: department.id,
      roleCodes: [],
      active: true,
    });
    const input = {
      people: [
        person('花名册', 2, '客房部', '服务员', '张三'),
        person('花名册', 3, '工程部', '电工', '王五'),
      ],
    };

    await expect(service.apply(input, '000000')).rejects.toBeInstanceOf(RosterImportConflictError);
    expect(await dataSource.getRepository(UserEntity).count()).toBe(1);
    expect(
      await dataSource.getRepository(DepartmentEntity).exist({
        where: { name: '工程部' },
      }),
    ).toBe(false);
  });

  it('uses only exact manager titles', async () => {
    const input = [
      person('花名册', 2, '前厅部', '副经理', '甲'),
      person('花名册', 3, '客房部', '客房部经理', '乙'),
      person('花名册', 4, '工程部', '值班经理', '丙'),
      person('花名册', 5, '财务部', '经理', '丁'),
    ];
    await service.apply(input, '000000');
    const departments = await dataSource.getRepository(DepartmentEntity).find();

    expect(managerName(departments, '前厅部')).toBeNull();
    expect(managerName(departments, '客房部')).toBe(rosterUserId('乙'));
    expect(managerName(departments, '工程部')).toBeNull();
    expect(managerName(departments, '财务部')).toBe(rosterUserId('丁'));
  });

  it('rejects credentials that the login contract could never accept', async () => {
    const longName = '人'.repeat(credentialPolicy.usernameMaxLength + 1);
    const preview = await service.preview([
      person('花名册', 2, '前厅部', '接待员', longName),
    ]);

    expect(preview.conflicts).toEqual([expect.objectContaining({ code: 'INPUT_INVALID' })]);
    await expect(
      service.apply(
        [person('花名册', 2, '前厅部', '接待员', '张三')],
        'x'.repeat(credentialPolicy.loginPasswordMaxLength + 1),
      ),
    ).rejects.toThrow('默认密码不能超过');
  });

  async function seedManualDepartment(): Promise<DepartmentEntity> {
    const department = dataSource.getRepository(DepartmentEntity).create({
      id: 'manual-department',
      code: 'MANUAL',
      name: '既有部门',
      managerUserId: null,
    });
    return dataSource.getRepository(DepartmentEntity).save(department);
  }
});

function person(
  sourceSheet: string,
  sourceSequence: number,
  department: string,
  position: string,
  name: string,
) {
  return { sourceSheet, sourceSequence, department, position, name };
}

function roleId(roles: RoleEntity[], code: string): string {
  const role = roles.find((candidate) => candidate.code === code);
  if (!role) throw new Error(`missing role ${code}`);
  return role.id;
}

function managerName(departments: DepartmentEntity[], departmentName: string): string | null {
  return (
    departments.find((department) => department.name === departmentName)?.managerUserId ?? null
  );
}
