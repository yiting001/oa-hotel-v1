import { ConflictException, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuthService } from '../src/common/auth/auth.service';
import { IamService } from '../src/common/iam/application/iam.service';

/**
 * 手机号既作为联系方式保存，也可以直接用来登录。
 */
describe('用户手机号', () => {
  let app: INestApplication;
  let auth: AuthService;
  let iam: IamService;
  let departmentId: string;

  beforeAll(async () => {
    process.env.OA_DATABASE_PATH = ':memory:';
    process.env.JWT_SECRET = 'user-phone-secret';
    process.env.OA_DEMO_PASSWORD = 'Demo123!';
    const { AppModule } = await import('../src/app.module');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    auth = moduleRef.get(AuthService);
    iam = moduleRef.get(IamService);
    const department = await iam.createDepartment({ code: 'PHONE_TEST', name: '手机号测试部' });
    departmentId = department.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('保存手机号后可以用手机号登录', async () => {
    const created = await iam.createUser({
      username: 'phone-user',
      displayName: '手机号测试用户',
      phone: '13810271599',
      password: 'Phone123!',
      memberships: [{ departmentId, isPrimary: true }],
      roles: [],
    });
    expect(created.phone).toBe('13810271599');

    const byPhone = await auth.login('13810271599', 'Phone123!');
    expect(byPhone.user.id).toBe(created.id);

    const byUsername = await auth.login('phone-user', 'Phone123!');
    expect(byUsername.user.id).toBe(created.id);
  });

  it('手机号会被归一化，重复手机号不允许', async () => {
    const created = await iam.createUser({
      username: 'phone-user-2',
      displayName: '手机号测试用户二',
      phone: '138 1027 1600',
      password: 'Phone123!',
      memberships: [{ departmentId, isPrimary: true }],
      roles: [],
    });
    expect(created.phone).toBe('13810271600');

    await expect(
      iam.createUser({
        username: 'phone-user-3',
        displayName: '手机号测试用户三',
        phone: '13810271600',
        password: 'Phone123!',
        memberships: [{ departmentId, isPrimary: true }],
        roles: [],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('可以清空手机号，清空后不能再用来登录', async () => {
    const created = await iam.createUser({
      username: 'phone-user-4',
      displayName: '手机号测试用户四',
      phone: '13810271601',
      password: 'Phone123!',
      memberships: [{ departmentId, isPrimary: true }],
      roles: [],
    });
    const cleared = await iam.updateUser(created.id, { phone: null });
    expect(cleared.phone).toBeNull();
    await expect(auth.login('13810271601', 'Phone123!')).rejects.toThrow('账号或密码错误');
  });
});
