import type { MigrationInterface, QueryRunner } from 'typeorm';

const permissionSeeds = [
  ['permission-iam-view', 'IAM_VIEW', '查看组织权限', 'IAM'],
  ['permission-iam-manage', 'IAM_MANAGE', '管理组织权限', 'IAM'],
  ['permission-form-design-view', 'FORM_DESIGN_VIEW', '查看表单设计', 'FORM_DESIGN'],
  ['permission-form-design-manage', 'FORM_DESIGN_MANAGE', '管理表单设计', 'FORM_DESIGN'],
  ['permission-process-design-view', 'PROCESS_DESIGN_VIEW', '查看流程设计', 'PROCESS_DESIGN'],
  ['permission-process-design-manage', 'PROCESS_DESIGN_MANAGE', '管理流程设计', 'PROCESS_DESIGN'],
  ['permission-document-create', 'DOCUMENT_CREATE', '发起单据', 'DOCUMENT'],
  ['permission-document-view', 'DOCUMENT_VIEW', '查看单据', 'DOCUMENT'],
  ['permission-workflow-approve', 'WORKFLOW_APPROVE', '办理审批任务', 'WORKFLOW'],
  ['permission-contract-manage', 'CONTRACT_MANAGE', '管理合同业务', 'CONTRACT'],
  ['permission-finance-review', 'FINANCE_REVIEW', '办理财务审核', 'FINANCE'],
  ['permission-seal-execute', 'SEAL_EXECUTE', '登记印章执行', 'SEAL'],
  ['permission-supply-procure', 'SUPPLY_PROCURE', '办理物资采购', 'SUPPLY'],
  ['permission-supply-issue', 'SUPPLY_ISSUE', '登记物资发放', 'SUPPLY'],
] as const;

const roleSeeds = [
  ['role-system-admin', 'SYSTEM_ADMIN', '系统管理员'],
  ['role-process-admin', 'PROCESS_ADMIN', '流程管理员'],
  ['role-form-admin', 'FORM_ADMIN', '表单管理员'],
  ['role-applicant', 'APPLICANT', '申请人'],
  ['role-department-manager', 'DEPARTMENT_MANAGER', '部门负责人'],
  ['role-finance-reviewer', 'FINANCE_REVIEWER', '财务审核人'],
  ['role-office-reviewer', 'OFFICE_REVIEWER', '办公室审核人'],
  ['role-seal-manager', 'SEAL_MANAGER', '印章管理员'],
  ['role-procurement', 'PROCUREMENT', '采购负责人'],
  ['role-warehouse-manager', 'WAREHOUSE_MANAGER', '仓库管理员'],
] as const;

const rolePermissionSeeds: ReadonlyArray<readonly [string, string]> = [
  ...permissionSeeds.map((permission) => ['role-system-admin', permission[0]] as const),
  ['role-process-admin', 'permission-iam-view'],
  ['role-process-admin', 'permission-form-design-view'],
  ['role-process-admin', 'permission-process-design-view'],
  ['role-process-admin', 'permission-process-design-manage'],
  ['role-form-admin', 'permission-iam-view'],
  ['role-form-admin', 'permission-form-design-view'],
  ['role-form-admin', 'permission-form-design-manage'],
  ['role-form-admin', 'permission-process-design-view'],
  ['role-applicant', 'permission-document-create'],
  ['role-applicant', 'permission-document-view'],
  ['role-department-manager', 'permission-document-view'],
  ['role-department-manager', 'permission-workflow-approve'],
  ['role-finance-reviewer', 'permission-document-view'],
  ['role-finance-reviewer', 'permission-workflow-approve'],
  ['role-finance-reviewer', 'permission-finance-review'],
  ['role-office-reviewer', 'permission-document-view'],
  ['role-office-reviewer', 'permission-workflow-approve'],
  ['role-seal-manager', 'permission-document-view'],
  ['role-seal-manager', 'permission-workflow-approve'],
  ['role-seal-manager', 'permission-seal-execute'],
  ['role-procurement', 'permission-document-view'],
  ['role-procurement', 'permission-workflow-approve'],
  ['role-procurement', 'permission-supply-procure'],
  ['role-warehouse-manager', 'permission-document-view'],
  ['role-warehouse-manager', 'permission-workflow-approve'],
  ['role-warehouse-manager', 'permission-supply-issue'],
];

export class IamOrganizationAccess1784000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "iam_department_profiles" (
        "departmentId" text PRIMARY KEY NOT NULL,
        "parentDepartmentId" text,
        "sortOrder" integer NOT NULL DEFAULT (0),
        "active" boolean NOT NULL DEFAULT (1),
        CONSTRAINT "FK_iam_department_profile_department" FOREIGN KEY ("departmentId") REFERENCES "departments" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_iam_department_profile_parent" FOREIGN KEY ("parentDepartmentId") REFERENCES "departments" ("id") ON DELETE RESTRICT
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_iam_department_profile_parent" ON "iam_department_profiles" ("parentDepartmentId")`,
    );

    await queryRunner.query(
      `CREATE TABLE "iam_positions" (
        "id" text PRIMARY KEY NOT NULL,
        "code" text NOT NULL,
        "name" text NOT NULL,
        "departmentId" text,
        "sortOrder" integer NOT NULL DEFAULT (0),
        "active" boolean NOT NULL DEFAULT (1),
        CONSTRAINT "UQ_iam_position_code" UNIQUE ("code"),
        CONSTRAINT "FK_iam_position_department" FOREIGN KEY ("departmentId") REFERENCES "departments" ("id") ON DELETE RESTRICT
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_iam_position_department" ON "iam_positions" ("departmentId")`,
    );

    await queryRunner.query(
      `CREATE TABLE "iam_memberships" (
        "id" text PRIMARY KEY NOT NULL,
        "userId" text NOT NULL,
        "departmentId" text NOT NULL,
        "positionId" text,
        "isPrimary" boolean NOT NULL DEFAULT (0),
        "isDepartmentHead" boolean NOT NULL DEFAULT (0),
        "active" boolean NOT NULL DEFAULT (1),
        CONSTRAINT "FK_iam_membership_user" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_iam_membership_department" FOREIGN KEY ("departmentId") REFERENCES "departments" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_iam_membership_position" FOREIGN KEY ("positionId") REFERENCES "iam_positions" ("id") ON DELETE RESTRICT
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_iam_membership_user_department" ON "iam_memberships" ("userId", "departmentId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_iam_membership_identity" ON "iam_memberships" ("userId", "departmentId", COALESCE("positionId", ''))`,
    );

    await queryRunner.query(
      `CREATE TABLE "iam_roles" (
        "id" text PRIMARY KEY NOT NULL,
        "code" text NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "active" boolean NOT NULL DEFAULT (1),
        CONSTRAINT "UQ_iam_role_code" UNIQUE ("code")
      )`,
    );

    await queryRunner.query(
      `CREATE TABLE "iam_permissions" (
        "id" text PRIMARY KEY NOT NULL,
        "code" text NOT NULL,
        "name" text NOT NULL,
        "module" text NOT NULL,
        "description" text,
        "active" boolean NOT NULL DEFAULT (1),
        CONSTRAINT "UQ_iam_permission_code" UNIQUE ("code")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_iam_permission_module" ON "iam_permissions" ("module")`,
    );

    await queryRunner.query(
      `CREATE TABLE "iam_user_roles" (
        "id" text PRIMARY KEY NOT NULL,
        "userId" text NOT NULL,
        "roleId" text NOT NULL,
        "dataScope" text NOT NULL DEFAULT ('SELF'),
        "scopeDepartmentId" text,
        CONSTRAINT "CK_iam_user_role_scope" CHECK ("dataScope" IN ('SELF', 'DEPARTMENT', 'DEPARTMENT_TREE', 'ALL')),
        CONSTRAINT "CK_iam_user_role_department" CHECK (
          ("dataScope" IN ('DEPARTMENT', 'DEPARTMENT_TREE') AND "scopeDepartmentId" IS NOT NULL)
          OR ("dataScope" IN ('SELF', 'ALL') AND "scopeDepartmentId" IS NULL)
        ),
        CONSTRAINT "FK_iam_user_role_user" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_iam_user_role_role" FOREIGN KEY ("roleId") REFERENCES "iam_roles" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_iam_user_role_department" FOREIGN KEY ("scopeDepartmentId") REFERENCES "departments" ("id") ON DELETE RESTRICT
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_iam_user_role_user_role" ON "iam_user_roles" ("userId", "roleId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_iam_user_role_grant" ON "iam_user_roles" ("userId", "roleId", "dataScope", COALESCE("scopeDepartmentId", ''))`,
    );

    await queryRunner.query(
      `CREATE TABLE "iam_role_permissions" (
        "roleId" text NOT NULL,
        "permissionId" text NOT NULL,
        PRIMARY KEY ("roleId", "permissionId"),
        CONSTRAINT "FK_iam_role_permission_role" FOREIGN KEY ("roleId") REFERENCES "iam_roles" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_iam_role_permission_permission" FOREIGN KEY ("permissionId") REFERENCES "iam_permissions" ("id") ON DELETE CASCADE
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_iam_role_permission_permission" ON "iam_role_permissions" ("permissionId")`,
    );
    await this.seedAccessCatalog(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "iam_role_permissions"`);
    await queryRunner.query(`DROP TABLE "iam_user_roles"`);
    await queryRunner.query(`DROP TABLE "iam_permissions"`);
    await queryRunner.query(`DROP TABLE "iam_roles"`);
    await queryRunner.query(`DROP TABLE "iam_memberships"`);
    await queryRunner.query(`DROP TABLE "iam_positions"`);
    await queryRunner.query(`DROP TABLE "iam_department_profiles"`);
  }

  private async seedAccessCatalog(queryRunner: QueryRunner): Promise<void> {
    for (const [id, code, name, module] of permissionSeeds) {
      await queryRunner.query(
        `INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (?, ?, ?, ?, NULL, 1)`,
        [id, code, name, module],
      );
    }
    for (const [id, code, name] of roleSeeds) {
      await queryRunner.query(
        `INSERT INTO "iam_roles" ("id", "code", "name", "description", "active") VALUES (?, ?, ?, NULL, 1)`,
        [id, code, name],
      );
    }
    for (const [roleId, permissionId] of rolePermissionSeeds) {
      await queryRunner.query(
        `INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (?, ?)`,
        [roleId, permissionId],
      );
    }
  }
}
