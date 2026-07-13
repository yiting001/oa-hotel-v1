import { Inject, Injectable, OnApplicationBootstrap, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { SessionUser } from '@oa/contracts';
import { hash, verify } from 'argon2';
import { randomBytes } from 'node:crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DepartmentEntity } from './department.entity';
import { UserEntity } from './user.entity';

export interface LoginResult {
  accessToken: string;
  user: SessionUser;
}

interface DemoUserSeed {
  id: string;
  username: string;
  displayName: string;
  departmentId: string;
  roleCodes: string[];
}

@Injectable()
export class AuthService implements OnApplicationBootstrap {
  static readonly jwtSecret = process.env.JWT_SECRET ?? randomBytes(48).toString('base64url');

  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(DepartmentEntity)
    private readonly departments: Repository<DepartmentEntity>,
    @Inject(JwtService)
    private readonly jwtService: JwtService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.NODE_ENV === 'production' || (await this.users.count()) > 0) {
      return;
    }
    await this.seedDevelopmentUsers();
  }

  async login(username: string, password: string): Promise<LoginResult> {
    const user = await this.users.findOneBy({ username, active: true });
    if (!user || !(await verify(user.passwordHash, password))) {
      throw new UnauthorizedException('账号或密码错误');
    }
    const sessionUser = await this.toSessionUser(user);
    return {
      accessToken: await this.jwtService.signAsync({ sub: user.id }),
      user: sessionUser,
    };
  }

  async getSessionUser(userId: string): Promise<SessionUser> {
    const user = await this.users.findOneBy({ id: userId, active: true });
    if (!user) {
      throw new UnauthorizedException('用户不存在或已停用');
    }
    return this.toSessionUser(user);
  }

  async listUsers(): Promise<SessionUser[]> {
    const users = await this.users.findBy({ active: true });
    return Promise.all(users.map((user) => this.toSessionUser(user)));
  }

  async listDepartments(): Promise<DepartmentEntity[]> {
    return this.departments.find({ order: { name: 'ASC' } });
  }

  private async toSessionUser(user: UserEntity): Promise<SessionUser> {
    const department = await this.departments.findOneByOrFail({ id: user.departmentId });
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      departmentId: department.id,
      departmentName: department.name,
      roleCodes: user.roleCodes,
    };
  }

  private async seedDevelopmentUsers(): Promise<void> {
    const departments: DepartmentEntity[] = [
      {
        id: 'dept-business',
        code: 'BUSINESS',
        name: '业务部',
        managerUserId: 'user-manager',
      },
      { id: 'dept-finance', code: 'FINANCE', name: '财务部', managerUserId: 'user-finance' },
      { id: 'dept-office', code: 'OFFICE', name: '办公室', managerUserId: 'user-office' },
      { id: 'dept-supply', code: 'SUPPLY', name: '采购仓储部', managerUserId: 'user-procurement' },
    ];
    await this.departments.save(departments);

    const passwordHash = await hash(process.env.OA_DEMO_PASSWORD ?? 'Demo123!');
    const seeds: DemoUserSeed[] = [
      {
        id: 'user-applicant',
        username: 'applicant',
        displayName: '业务申请人',
        departmentId: 'dept-business',
        roleCodes: ['APPLICANT'],
      },
      {
        id: 'user-manager',
        username: 'manager',
        displayName: '部门总监',
        departmentId: 'dept-business',
        roleCodes: ['DEPARTMENT_MANAGER'],
      },
      {
        id: 'user-finance',
        username: 'finance',
        displayName: '财务审核人',
        departmentId: 'dept-finance',
        roleCodes: ['FINANCE_REVIEWER'],
      },
      {
        id: 'user-office',
        username: 'office',
        displayName: '办公室审核人',
        departmentId: 'dept-office',
        roleCodes: ['OFFICE_REVIEWER', 'SEAL_MANAGER'],
      },
      {
        id: 'user-procurement',
        username: 'procurement',
        displayName: '采购负责人',
        departmentId: 'dept-supply',
        roleCodes: ['PROCUREMENT'],
      },
      {
        id: 'user-warehouse',
        username: 'warehouse',
        displayName: '仓库管理员',
        departmentId: 'dept-supply',
        roleCodes: ['WAREHOUSE_MANAGER'],
      },
    ];
    await this.users.save(
      seeds.map((seed) => ({
        ...seed,
        passwordHash,
        active: true,
      })),
    );
  }
}
