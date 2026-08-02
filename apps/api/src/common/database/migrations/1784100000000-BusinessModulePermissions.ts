import type { MigrationInterface, QueryRunner } from 'typeorm';

const permissions = [
  ['permission-contract-create', 'CONTRACT_CREATE', '创建合同支出单据', 'CONTRACT'],
  ['permission-contract-view', 'CONTRACT_VIEW', '查看合同支出单据', 'CONTRACT'],
  ['permission-seal-create', 'SEAL_CREATE', '创建印章申请单据', 'SEAL'],
  ['permission-seal-view', 'SEAL_VIEW', '查看印章申请单据', 'SEAL'],
  ['permission-supply-create', 'SUPPLY_CREATE', '创建物资申请单据', 'SUPPLY'],
  ['permission-supply-view', 'SUPPLY_VIEW', '查看物资申请单据', 'SUPPLY'],
] as const;

const rolePermissions: ReadonlyArray<readonly [string, string]> = [
  ...permissions.map((permission) => ['role-system-admin', permission[0]] as const),
  ['role-applicant', 'permission-contract-create'],
  ['role-applicant', 'permission-contract-view'],
  ['role-applicant', 'permission-seal-create'],
  ['role-applicant', 'permission-seal-view'],
  ['role-applicant', 'permission-supply-create'],
  ['role-applicant', 'permission-supply-view'],
  ['role-department-manager', 'permission-contract-view'],
  ['role-department-manager', 'permission-seal-view'],
  ['role-department-manager', 'permission-supply-view'],
  ['role-finance-reviewer', 'permission-contract-view'],
  ['role-finance-reviewer', 'permission-supply-view'],
  ['role-office-reviewer', 'permission-contract-view'],
  ['role-office-reviewer', 'permission-seal-view'],
  ['role-seal-manager', 'permission-seal-view'],
  ['role-procurement', 'permission-supply-view'],
  ['role-warehouse-manager', 'permission-supply-view'],
];

/** Adds module qualifiers without broadening any role's existing data scope. */
export class BusinessModulePermissions1784100000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    for (const [id, code, name, module] of permissions) {
      await queryRunner.query(
        `INSERT OR IGNORE INTO "iam_permissions"
          ("id", "code", "name", "module", "description", "active")
          VALUES (?, ?, ?, ?, NULL, 1)`,
        [id, code, name, module],
      );
    }
    for (const [roleId, permissionId] of rolePermissions) {
      await queryRunner.query(
        `INSERT OR IGNORE INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (?, ?)`,
        [roleId, permissionId],
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const permissionIds = permissions.map(([id]) => id);
    const placeholders = permissionIds.map(() => '?').join(', ');
    await queryRunner.query(
      `DELETE FROM "iam_role_permissions" WHERE "permissionId" IN (${placeholders})`,
      permissionIds,
    );
    await queryRunner.query(
      `DELETE FROM "iam_permissions" WHERE "id" IN (${placeholders})`,
      permissionIds,
    );
  }
}
