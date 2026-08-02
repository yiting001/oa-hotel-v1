import type { MigrationInterface, QueryRunner } from 'typeorm';

const roles = [
  ['role-initiator', 'INITIATOR', '发起人'],
  ['role-admin-approver', 'ADMIN_APPROVER', '行政审批人'],
  ['role-business-approver', 'BUSINESS_APPROVER', '商务审批人'],
  ['role-catering-approver', 'CATERING_APPROVER', '餐饮审批人'],
  ['role-exec-pre-approver', 'EXEC_PRE_APPROVER', '高管预审批'],
  ['role-exec-approver', 'EXEC_APPROVER', '高管审批'],
] as const;

const permissions = [
  ['permission-purchase-create', 'PURCHASE_CREATE', '创建采购审批单据', 'PURCHASE'],
  ['permission-purchase-view', 'PURCHASE_VIEW', '查看采购审批单据', 'PURCHASE'],
  ['permission-petty-create', 'PETTY_CREATE', '创建零星采买单据', 'PETTY'],
  ['permission-petty-view', 'PETTY_VIEW', '查看零星采买单据', 'PETTY'],
] as const;

const approverRoleIds = [
  'role-admin-approver',
  'role-business-approver',
  'role-catering-approver',
  'role-exec-pre-approver',
  'role-exec-approver',
];

const rolePermissions: ReadonlyArray<readonly [string, string]> = [
  ...permissions.map((permission) => ['role-system-admin', permission[0]] as const),
  ['role-initiator', 'permission-document-create'],
  ['role-initiator', 'permission-document-view'],
  ['role-initiator', 'permission-contract-create'],
  ['role-initiator', 'permission-contract-view'],
  ['role-initiator', 'permission-purchase-create'],
  ['role-initiator', 'permission-purchase-view'],
  ['role-initiator', 'permission-petty-create'],
  ['role-initiator', 'permission-petty-view'],
  ...approverRoleIds.flatMap((roleId) => [
    [roleId, 'permission-document-view'] as const,
    [roleId, 'permission-workflow-approve'] as const,
    [roleId, 'permission-contract-view'] as const,
    [roleId, 'permission-purchase-view'] as const,
    [roleId, 'permission-petty-view'] as const,
  ]),
];

const workflowDefinitions = [
  [
    'purchase-approval',
    'PURCHASE_APPROVAL',
    '采购审批',
    '["BUSINESS_APPROVER","EXEC_PRE_APPROVER","EXEC_APPROVER"]',
  ],
  [
    'petty-procurement',
    'PETTY_PROCUREMENT',
    '零星采买',
    '["CATERING_APPROVER","EXEC_PRE_APPROVER","EXEC_APPROVER"]',
  ],
] as const;

/** 采购审批体系基础：六类角色、采购/零星采买模块权限、新审批链与统一单号序列表。 */
export class ProcurementApprovalFoundation1784800000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    for (const [id, code, name] of roles) {
      await queryRunner.query(
        `INSERT OR IGNORE INTO "iam_roles" ("id", "code", "name", "description", "active")
          VALUES (?, ?, ?, NULL, 1)`,
        [id, code, name],
      );
    }
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
    for (const [code, documentType, name, steps] of workflowDefinitions) {
      await queryRunner.query(
        `INSERT OR IGNORE INTO "workflow_definitions"
          ("code", "documentType", "name", "steps", "version", "active")
          VALUES (?, ?, ?, ?, 1, 1)`,
        [code, documentType, name, steps],
      );
    }
    await queryRunner.query(
      `UPDATE "workflow_definitions"
        SET "steps" = ?, "version" = "version" + 1
        WHERE "code" = 'contract-approval'`,
      ['["ADMIN_APPROVER","BUSINESS_APPROVER","EXEC_PRE_APPROVER","EXEC_APPROVER"]'],
    );
    await queryRunner.query(`ALTER TABLE "document_indexes" ADD COLUMN "documentNo" text`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_document_indexes_document_no"
        ON "document_indexes" ("documentNo") WHERE "documentNo" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "document_number_sequences" (
        "prefix" text NOT NULL,
        "dateKey" text NOT NULL,
        "nextSerial" integer NOT NULL DEFAULT (1),
        PRIMARY KEY ("prefix", "dateKey")
      )`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "document_number_sequences"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_document_indexes_document_no"`);
    await queryRunner.query(`ALTER TABLE "document_indexes" DROP COLUMN "documentNo"`);
    for (const [code] of workflowDefinitions) {
      await queryRunner.query(`DELETE FROM "workflow_definitions" WHERE "code" = ?`, [code]);
    }
    const permissionIds = permissions.map(([id]) => id);
    const permissionPlaceholders = permissionIds.map(() => '?').join(', ');
    await queryRunner.query(
      `DELETE FROM "iam_role_permissions" WHERE "permissionId" IN (${permissionPlaceholders})`,
      permissionIds,
    );
    const roleIds = roles.map(([id]) => id);
    const rolePlaceholders = roleIds.map(() => '?').join(', ');
    await queryRunner.query(
      `DELETE FROM "iam_role_permissions" WHERE "roleId" IN (${rolePlaceholders})`,
      roleIds,
    );
    await queryRunner.query(
      `DELETE FROM "iam_permissions" WHERE "id" IN (${permissionPlaceholders})`,
      permissionIds,
    );
    await queryRunner.query(`DELETE FROM "iam_roles" WHERE "id" IN (${rolePlaceholders})`, roleIds);
  }
}
