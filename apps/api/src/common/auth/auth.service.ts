import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  OnApplicationBootstrap,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { DirectoryUser, SessionUser } from '@oa/contracts';
import { hash, verify } from 'argon2';
import { randomBytes } from 'node:crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DepartmentEntity } from './department.entity';
import { UserEntity } from './user.entity';
import { IamService } from '../iam/application/iam.service';
import { LoginAttemptLimiter } from './login-attempt-limiter.service';
import { credentialPolicy } from './credential-policy';
import { LoginPasswordVerifier } from './login-password-verifier.service';

export interface LoginResult {
  accessToken: string;
  user: SessionUser;
}

interface DevelopmentUserSeed {
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
    @Inject(IamService)
    private readonly iam: IamService,
    @Inject(LoginAttemptLimiter)
    private readonly loginAttempts: LoginAttemptLimiter,
    @Inject(LoginPasswordVerifier)
    private readonly loginPasswordVerifier: LoginPasswordVerifier,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.NODE_ENV !== 'production' && (await this.users.count()) === 0) {
      await this.seedDevelopmentUsers();
    }
    await this.iam.ensureLegacyAssignments();
  }

  async login(username: string, password: string): Promise<LoginResult> {
    const attempt = await this.loginAttempts.reserve(username);
    const user = await this.users.findOneBy({ username: attempt.username, active: true });
    const passwordMatches = await this.loginPasswordVerifier.matches(user?.passwordHash, password);
    if (!user || !passwordMatches) {
      await this.loginAttempts.recordFailure(attempt);
      throw new UnauthorizedException('账号或密码错误');
    }
    await this.loginAttempts.recordSuccess(attempt);
    return this.createLoginResult(user);
  }

  async getSessionUser(userId: string, expectedCredentialVersion?: number): Promise<SessionUser> {
    const user = await this.users.findOneBy({ id: userId, active: true });
    if (!user) {
      throw new UnauthorizedException('用户不存在或已停用');
    }
    if (
      expectedCredentialVersion !== undefined &&
      (user.credentialVersion ?? 0) !== expectedCredentialVersion
    ) {
      throw new UnauthorizedException('登录状态已失效，请重新登录');
    }
    return this.toSessionUser(user);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<LoginResult> {
    const user = await this.users.findOneBy({ id: userId, active: true });
    if (!user || !(await verify(user.passwordHash, currentPassword))) {
      throw new BadRequestException({
        code: 'CURRENT_PASSWORD_INVALID',
        message: '当前密码错误',
      });
    }
    if (newPassword === currentPassword) {
      throw new BadRequestException({
        code: 'NEW_PASSWORD_MUST_DIFFER',
        message: '新密码不能与当前密码相同',
      });
    }
    if (!/\S/u.test(newPassword)) {
      throw new BadRequestException({
        code: 'NEW_PASSWORD_INVALID',
        message: '新密码不能全部为空白字符',
      });
    }
    if (
      newPassword.length < credentialPolicy.newPasswordMinLength ||
      newPassword.length > credentialPolicy.newPasswordMaxLength
    ) {
      throw new BadRequestException({
        code: 'NEW_PASSWORD_LENGTH_INVALID',
        message: `新密码长度必须在 ${credentialPolicy.newPasswordMinLength} 至 ${credentialPolicy.newPasswordMaxLength} 位之间`,
      });
    }

    const credentialVersion = user.credentialVersion ?? 0;
    const result = await this.users.update(
      { id: user.id, active: true, credentialVersion },
      {
        passwordHash: await hash(newPassword),
        passwordChangeRequired: false,
        passwordChangedAt: new Date(),
        credentialVersion: credentialVersion + 1,
      },
    );
    if (result.affected !== 1) {
      throw new ConflictException({
        code: 'CREDENTIAL_VERSION_CONFLICT',
        message: '密码已被其他请求修改，请重新登录后重试',
      });
    }

    const updated = await this.users.findOneByOrFail({ id: user.id, active: true });
    return this.createLoginResult(updated);
  }

  async listUsers(): Promise<DirectoryUser[]> {
    const users = await this.iam.listUsers();
    return users.flatMap((user) => {
      const primaryMembership =
        user.memberships.find((membership) => membership.active && membership.isPrimary) ??
        user.memberships.find((membership) => membership.active);
      return user.active && primaryMembership
        ? [
            {
              id: user.id,
              username: user.username,
              displayName: user.displayName,
              departmentId: primaryMembership.departmentId,
              departmentName: primaryMembership.departmentName,
            },
          ]
        : [];
    });
  }

  async listDepartments(): Promise<DepartmentEntity[]> {
    return this.departments.find({ order: { name: 'ASC' } });
  }

  private async toSessionUser(user: UserEntity): Promise<SessionUser> {
    const profile = await this.iam.getSessionProfile(user.id);
    const primaryMembership =
      profile.memberships.find((membership) => membership.isPrimary) ?? profile.memberships[0];
    const department = primaryMembership
      ? { id: primaryMembership.departmentId, name: primaryMembership.departmentName }
      : await this.departments.findOneByOrFail({ id: user.departmentId });
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      departmentId: department.id,
      departmentName: department.name,
      roleCodes: profile.roleCodes,
      permissionCodes: profile.permissionCodes,
      memberships: profile.memberships,
      dataScopes: profile.dataScopes,
      passwordChangeRequired: user.passwordChangeRequired ?? false,
    };
  }

  private async createLoginResult(user: UserEntity): Promise<LoginResult> {
    return {
      accessToken: await this.jwtService.signAsync({
        sub: user.id,
        credentialVersion: user.credentialVersion ?? 0,
      }),
      user: await this.toSessionUser(user),
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

    const developmentPassword = process.env.OA_DEMO_PASSWORD;
    if (!developmentPassword) {
      throw new Error('首次初始化开发数据必须设置 OA_DEMO_PASSWORD');
    }
    const passwordHash = await hash(developmentPassword);
    const seeds: DevelopmentUserSeed[] = [
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
