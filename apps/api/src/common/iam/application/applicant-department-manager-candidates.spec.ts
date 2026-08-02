import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DepartmentEntity } from '../../auth/department.entity';
import { UserEntity } from '../../auth/user.entity';
import { IamModule } from '../iam.module';
import { DepartmentProfileEntity, iamEntities, MembershipEntity } from '../infrastructure/entities';
import { IamService } from './iam.service';

describe('申请部门负责人候选人解析', () => {
  const originalBootstrapAdmin = process.env.OA_BOOTSTRAP_ADMIN_USERNAME;
  let moduleRef: TestingModule;
  let service: IamService;

  beforeAll(async () => {
    delete process.env.OA_BOOTSTRAP_ADMIN_USERNAME;
    moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          entities: [UserEntity, DepartmentEntity, ...iamEntities],
          synchronize: true,
        }),
        IamModule,
      ],
    }).compile();
    service = moduleRef.get(IamService);
    await seedOrganization(moduleRef);
  });

  afterAll(async () => {
    await moduleRef?.close();
    if (originalBootstrapAdmin === undefined) {
      delete process.env.OA_BOOTSTRAP_ADMIN_USERNAME;
    } else {
      process.env.OA_BOOTSTRAP_ADMIN_USERNAME = originalBootstrapAdmin;
    }
  });

  it('优先返回部门配置的启用负责人，且不要求固定角色', async () => {
    await expect(
      service.resolveApplicantDepartmentManagerUsers('dept-configured'),
    ).resolves.toEqual([
      {
        id: 'user-configured',
        username: 'configured',
        displayName: '配置负责人',
      },
    ]);
  });

  it('配置负责人不可用时回退启用的部门负责人任职', async () => {
    const candidates = await service.resolveApplicantDepartmentManagerUsers('dept-heads');

    expect(candidates.map((candidate) => candidate.id).sort()).toEqual([
      'user-head-a',
      'user-head-b',
    ]);
  });

  it('拒绝不存在或已停用部门', async () => {
    await expect(
      service.resolveApplicantDepartmentManagerUsers('dept-disabled'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.resolveApplicantDepartmentManagerUsers('dept-missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

async function seedOrganization(moduleRef: TestingModule): Promise<void> {
  const departments = moduleRef.get<Repository<DepartmentEntity>>(
    getRepositoryToken(DepartmentEntity),
  );
  const profiles = moduleRef.get<Repository<DepartmentProfileEntity>>(
    getRepositoryToken(DepartmentProfileEntity),
  );
  const users = moduleRef.get<Repository<UserEntity>>(getRepositoryToken(UserEntity));
  const memberships = moduleRef.get<Repository<MembershipEntity>>(
    getRepositoryToken(MembershipEntity),
  );

  await departments.insert([
    configuredDepartment('dept-configured', 'CONFIGURED', 'user-configured'),
    configuredDepartment('dept-heads', 'HEADS', 'user-inactive-manager'),
    configuredDepartment('dept-disabled', 'DISABLED', null),
  ]);
  await profiles.insert([
    departmentProfile('dept-configured', true),
    departmentProfile('dept-heads', true),
    departmentProfile('dept-disabled', false),
  ]);
  await users.insert([
    testUser('user-configured', 'configured', '配置负责人', 'dept-configured'),
    testUser('user-configured-head', 'configured-head', '配置部门任职负责人', 'dept-configured'),
    testUser('user-inactive-manager', 'inactive-manager', '停用配置负责人', 'dept-heads', false),
    testUser('user-head-a', 'head-a', '任职负责人甲', 'dept-heads'),
    testUser('user-head-b', 'head-b', '任职负责人乙', 'dept-heads'),
    testUser('user-inactive-head', 'inactive-head', '停用任职负责人', 'dept-heads', false),
    testUser('user-non-head', 'non-head', '普通任职用户', 'dept-heads'),
    testUser('user-disabled-membership', 'disabled-membership', '停用任职关系', 'dept-heads'),
  ]);
  await memberships.insert([
    membership('membership-configured-head', 'user-configured-head', 'dept-configured', true, true),
    membership('membership-head-a', 'user-head-a', 'dept-heads', true, true),
    membership('membership-head-b', 'user-head-b', 'dept-heads', true, true),
    membership('membership-inactive-head', 'user-inactive-head', 'dept-heads', true, true),
    membership('membership-non-head', 'user-non-head', 'dept-heads', false, true),
    membership('membership-disabled', 'user-disabled-membership', 'dept-heads', true, false),
  ]);
}

function configuredDepartment(
  id: string,
  code: string,
  managerUserId: string | null,
): DepartmentEntity {
  return { id, code, name: `${code} 部门`, managerUserId };
}

function departmentProfile(departmentId: string, active: boolean): DepartmentProfileEntity {
  return { departmentId, parentDepartmentId: null, sortOrder: 0, active };
}

function testUser(
  id: string,
  username: string,
  displayName: string,
  departmentId: string,
  active = true,
): UserEntity {
  return {
    id,
    username,
    displayName,
    passwordHash: 'unused-in-service-test',
    departmentId,
    roleCodes: [],
    active,
  };
}

function membership(
  id: string,
  userId: string,
  departmentId: string,
  isDepartmentHead: boolean,
  active: boolean,
): MembershipEntity {
  return {
    id,
    userId,
    departmentId,
    positionId: null,
    isPrimary: true,
    isDepartmentHead,
    active,
  };
}
