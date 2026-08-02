import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, In, Repository } from 'typeorm';
import { DepartmentEntity } from '../../auth/department.entity';
import { UserEntity } from '../../auth/user.entity';
import { DepartmentProfileEntity } from '../infrastructure/department-profile.entity';
import { MembershipEntity } from '../infrastructure/membership.entity';
import { PositionEntity } from '../infrastructure/position.entity';
import type {
  CandidateUser,
  DepartmentNode,
  DepartmentWriteInput,
  PositionWriteInput,
} from './iam.models';
import { buildDepartmentTree, collectDepartmentDescendants } from './organization-tree';

type CreateDepartmentInput = DepartmentWriteInput &
  Required<Pick<DepartmentWriteInput, 'code' | 'name'>>;
type CreatePositionInput = PositionWriteInput & Required<Pick<PositionWriteInput, 'code' | 'name'>>;

@Injectable()
export class IamOrganizationService {
  constructor(
    @InjectRepository(DepartmentEntity)
    private readonly departments: Repository<DepartmentEntity>,
    @InjectRepository(DepartmentProfileEntity)
    private readonly departmentProfiles: Repository<DepartmentProfileEntity>,
    @InjectRepository(PositionEntity)
    private readonly positions: Repository<PositionEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(MembershipEntity)
    private readonly memberships: Repository<MembershipEntity>,
    @Inject(DataSource)
    private readonly dataSource: DataSource,
  ) {}

  async listDepartmentTree(): Promise<DepartmentNode[]> {
    const [departments, profiles] = await Promise.all([
      this.departments.find(),
      this.departmentProfiles.find(),
    ]);
    return buildDepartmentTree(departments, profiles);
  }

  /** Resolves the manager of the applicant's department without inferring an RBAC role. */
  async resolveApplicantDepartmentManagerUsers(departmentId: string): Promise<CandidateUser[]> {
    const [department, profile] = await Promise.all([
      this.departments.findOneBy({ id: departmentId }),
      this.departmentProfiles.findOneBy({ departmentId }),
    ]);
    if (!department || profile?.active === false) {
      throw new NotFoundException('申请部门不存在或已停用');
    }

    if (department.managerUserId) {
      const configured = await this.findActiveCandidateUsers([department.managerUserId]);
      if (configured.length > 0) return configured;
    }

    const departmentHeads = await this.memberships.findBy({
      departmentId,
      isDepartmentHead: true,
      active: true,
    });
    return this.findActiveCandidateUsers(departmentHeads.map((membership) => membership.userId));
  }

  async createDepartment(input: CreateDepartmentInput): Promise<DepartmentNode> {
    await this.assertDepartmentReference(input.parentId ?? null);
    await this.assertManager(input.managerUserId ?? null);
    await this.assertDepartmentCodeAvailable(input.code);

    const id = randomUUID();
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(DepartmentEntity).save({
        id,
        code: normalizeCode(input.code),
        name: input.name.trim(),
        managerUserId: input.managerUserId ?? null,
      });
      await manager.getRepository(DepartmentProfileEntity).save({
        departmentId: id,
        parentDepartmentId: input.parentId ?? null,
        sortOrder: input.sortOrder ?? 0,
        active: input.active ?? true,
      });
    });
    return this.getDepartmentNode(id);
  }

  async updateDepartment(id: string, input: DepartmentWriteInput): Promise<DepartmentNode> {
    const department = await this.departments.findOneBy({ id });
    if (!department) throw new NotFoundException('部门不存在');

    if (input.code !== undefined) await this.assertDepartmentCodeAvailable(input.code, id);
    if (input.managerUserId !== undefined) await this.assertManager(input.managerUserId);
    if (input.parentId !== undefined) await this.assertValidParent(id, input.parentId);

    const profile = (await this.departmentProfiles.findOneBy({ departmentId: id })) ?? {
      departmentId: id,
      parentDepartmentId: null,
      sortOrder: 0,
      active: true,
    };
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(DepartmentEntity).save({
        ...department,
        code: input.code === undefined ? department.code : normalizeCode(input.code),
        name: input.name === undefined ? department.name : input.name.trim(),
        managerUserId:
          input.managerUserId === undefined ? department.managerUserId : input.managerUserId,
      });
      await manager.getRepository(DepartmentProfileEntity).save({
        ...profile,
        parentDepartmentId:
          input.parentId === undefined ? profile.parentDepartmentId : input.parentId,
        sortOrder: input.sortOrder ?? profile.sortOrder,
        active: input.active ?? profile.active,
      });
    });
    return this.getDepartmentNode(id);
  }

  async listPositions(departmentId?: string): Promise<PositionEntity[]> {
    return this.positions.find({
      where: departmentId ? { departmentId } : {},
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async createPosition(input: CreatePositionInput): Promise<PositionEntity> {
    await this.assertDepartmentReference(input.departmentId ?? null);
    await this.assertPositionCodeAvailable(input.code);
    return this.positions.save({
      id: randomUUID(),
      code: normalizeCode(input.code),
      name: input.name.trim(),
      departmentId: input.departmentId ?? null,
      sortOrder: input.sortOrder ?? 0,
      active: input.active ?? true,
    });
  }

  async updatePosition(id: string, input: PositionWriteInput): Promise<PositionEntity> {
    const position = await this.positions.findOneBy({ id });
    if (!position) throw new NotFoundException('岗位不存在');
    if (input.code !== undefined) await this.assertPositionCodeAvailable(input.code, id);
    if (input.departmentId !== undefined) await this.assertDepartmentReference(input.departmentId);

    return this.positions.save({
      ...position,
      code: input.code === undefined ? position.code : normalizeCode(input.code),
      name: input.name === undefined ? position.name : input.name.trim(),
      departmentId: input.departmentId === undefined ? position.departmentId : input.departmentId,
      sortOrder: input.sortOrder ?? position.sortOrder,
      active: input.active ?? position.active,
    });
  }

  async deleteDepartment(id: string): Promise<void> {
    const department = await this.departments.findOneBy({ id });
    if (!department) throw new NotFoundException('部门不存在');
    const profiles = await this.departmentProfiles.find();
    if (profiles.some((profile) => profile.parentDepartmentId === id)) {
      throw new BadRequestException('请先删除或迁移下级部门');
    }
    const [membershipCount, positionCount] = await Promise.all([
      this.memberships.countBy({ departmentId: id }),
      this.positions.countBy({ departmentId: id }),
    ]);
    if (membershipCount > 0) throw new BadRequestException('部门下存在人员任职，无法删除');
    if (positionCount > 0) throw new BadRequestException('部门下存在岗位，请先删除岗位');
    if (await this.users.exist({ where: { departmentId: id } })) {
      throw new BadRequestException('部门被用户档案引用，无法删除');
    }
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(DepartmentProfileEntity).delete({ departmentId: id });
      await manager.getRepository(DepartmentEntity).delete({ id });
    });
  }

  async deletePosition(id: string): Promise<void> {
    const position = await this.positions.findOneBy({ id });
    if (!position) throw new NotFoundException('岗位不存在');
    if (await this.memberships.exist({ where: { positionId: id } })) {
      throw new BadRequestException('岗位已被人员任职引用，无法删除');
    }
    await this.positions.delete({ id });
  }

  async departmentDescendants(departmentId: string): Promise<Set<string>> {
    const exists = await this.departments.exist({ where: { id: departmentId } });
    if (!exists) throw new NotFoundException('部门不存在');
    return collectDepartmentDescendants(departmentId, await this.departmentProfiles.find());
  }

  private async getDepartmentNode(id: string): Promise<DepartmentNode> {
    const stack = [...(await this.listDepartmentTree())];
    while (stack.length > 0) {
      const node = stack.shift();
      if (!node) break;
      if (node.id === id) return node;
      stack.push(...node.children);
    }
    throw new NotFoundException('部门不存在');
  }

  private async findActiveCandidateUsers(userIds: string[]): Promise<CandidateUser[]> {
    const uniqueIds = [...new Set(userIds)];
    if (uniqueIds.length === 0) return [];
    const users = await this.users.find({
      where: { id: In(uniqueIds), active: true },
      order: { displayName: 'ASC' },
    });
    return users.map(({ id, username, displayName }) => ({ id, username, displayName }));
  }

  private async assertValidParent(id: string, parentId: string | null): Promise<void> {
    if (!parentId) return;
    if (parentId === id) throw new BadRequestException('部门不能作为自己的上级');
    await this.assertDepartmentReference(parentId);
    const descendants = await this.departmentDescendants(id);
    if (descendants.has(parentId)) throw new BadRequestException('部门层级不能形成循环');
  }

  private async assertDepartmentReference(departmentId: string | null): Promise<void> {
    if (!departmentId) return;
    if (!(await this.departments.exist({ where: { id: departmentId } }))) {
      throw new BadRequestException('引用的部门不存在');
    }
  }

  private async assertManager(userId: string | null): Promise<void> {
    if (!userId) return;
    if (!(await this.users.exist({ where: { id: userId, active: true } }))) {
      throw new BadRequestException('部门负责人不存在或已停用');
    }
  }

  private async assertDepartmentCodeAvailable(code: string, excludingId?: string): Promise<void> {
    const existing = await this.departments.findOneBy({ code: normalizeCode(code) });
    if (existing && existing.id !== excludingId) throw new ConflictException('部门编码已存在');
  }

  private async assertPositionCodeAvailable(code: string, excludingId?: string): Promise<void> {
    const existing = await this.positions.findOneBy({ code: normalizeCode(code) });
    if (existing && existing.id !== excludingId) throw new ConflictException('岗位编码已存在');
  }
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}
