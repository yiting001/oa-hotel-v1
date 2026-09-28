import { randomUUID } from 'node:crypto';
import type { QueryRunner } from 'typeorm';
import { BUSINESS_WORKFLOW_CATALOG } from '../workflow/domain/business-workflow.catalog';
import { createBusinessProcessTemplate } from '../process-design/seed/business-process.templates';

const ADJUSTED_DOCUMENT_TYPES = [
  'SEAL_USE',
  'SEAL_BORROW',
  'PURCHASE_APPROVAL',
  'PETTY_PROCUREMENT',
] as const;

/** 2026 年流程细化涉及的链路：请示批复、合同审批（人工选择下一步）、零星采买。 */
const REFINED_DOCUMENT_TYPES = [
  'CONTRACT_REQUEST',
  'CONTRACT_APPROVAL',
  'PETTY_PROCUREMENT',
] as const;

/** 外部律师角色：由行政办公室在合同审批中选择，属于外部协作岗。 */
const LEGAL_ADVISOR_ROLE = [
  'role-legal-advisor',
  'LEGAL_ADVISOR',
  '外部律师',
] as const;

/** 零星采买限定发起人：只有这四位经办人可以发起零星采买单据。 */
const PETTY_REQUESTER_ROLE = [
  'role-petty-requester',
  'PETTY_REQUESTER',
  '零星采买发起人',
] as const;

const PETTY_REQUESTER_USER_IDS = [
  'user-wangchao',
  'user-linan',
  'user-zhangpingfei',
  'user-xizigang',
] as const;

const PETTY_REQUESTER_PERMISSION_CODES = [
  'PETTY_CREATE',
  'PETTY_VIEW',
  'DOCUMENT_CREATE',
  'DOCUMENT_VIEW',
] as const;

/** 收回发起权限的角色：保留系统管理员，避免无人能够维护数据。 */
const PETTY_CREATE_REVOKED_ROLES = ['role-initiator', 'role-exec-pre-approver'] as const;

const ROLE_PERMISSION_GRANTS: ReadonlyArray<readonly [string, string]> = [
  ['role-exec-pre-approver', 'permission-seal-view'],
  ['role-exec-approver', 'permission-seal-view'],
  ['role-procurement', 'permission-purchase-view'],
  ['role-procurement', 'permission-petty-view'],
  ['role-finance-reviewer', 'permission-purchase-view'],
  ['role-finance-reviewer', 'permission-petty-view'],
];

const ROLE_NAME_UPDATES: ReadonlyArray<readonly [string, string]> = [
  ['EXEC_PRE_APPROVER', '分管副总'],
  ['EXEC_APPROVER', '总经理'],
];

type Dialect = 'sqlite' | 'postgres';

function placeholders(dialect: Dialect, count: number): string[] {
  return Array.from({ length: count }, (_, index) =>
    dialect === 'postgres' ? `$${index + 1}` : '?',
  );
}

/** Adds the 财务主管副总 role used between finance review and the general manager. */
export async function ensureFinanceExecRole(
  queryRunner: QueryRunner,
  dialect: Dialect,
): Promise<void> {
  const insertVerb = dialect === 'postgres' ? 'INSERT INTO' : 'INSERT OR IGNORE INTO';
  const conflictClause = dialect === 'postgres' ? 'ON CONFLICT DO NOTHING' : '';
  await queryRunner.query(
    `${insertVerb} "iam_roles" ("id", "code", "name", "description", "active")
      VALUES ('role-finance-exec', 'FINANCE_EXEC', '财务主管副总', NULL, true) ${conflictClause}`,
  );
  await queryRunner.query(
    `${insertVerb} "iam_role_permissions" ("roleId", "permissionId")
      SELECT 'role-finance-exec', "permissionId" FROM "iam_role_permissions"
        WHERE "roleId" = 'role-exec-pre-approver' ${conflictClause}`,
  );
}

/**
 * Re-publishes the seal / purchase / petty approval chains from the current
 * business workflow catalog and aligns executive role display names.
 * Existing running documents stay bound to their retired process versions.
 */
async function republishCatalogChains(
  queryRunner: QueryRunner,
  dialect: Dialect,
  documentTypes: readonly string[],
  changeNote: string,
): Promise<void> {
  const p = (count: number) => placeholders(dialect, count);
  const now = new Date().toISOString();

  for (const documentType of documentTypes) {
    const definition = BUSINESS_WORKFLOW_CATALOG.find(
      (candidate) => candidate.documentType === documentType,
    );
    if (!definition) continue;
    const template = createBusinessProcessTemplate(definition);
    const steps = JSON.stringify(definition.approvalRoles);

    const [stepsPh, docTypePh] = p(2);
    await queryRunner.query(
      `UPDATE "workflow_definitions" SET "steps" = ${stepsPh}, "version" = "version" + 1
        WHERE "documentType" = ${docTypePh}`,
      [steps, documentType],
    );

    const [codePh] = p(1);
    const definitionRows: Array<{ id: string }> = await queryRunner.query(
      `SELECT "id" FROM "process_definitions" WHERE "code" = ${codePh}`,
      [definition.processCode],
    );
    const definitionId = definitionRows[0]?.id;
    if (!definitionId) continue;

    const [definitionIdPh] = p(1);
    const publishedRows: Array<{ id: string; designJson: string }> = await queryRunner.query(
      `SELECT "id", "designJson" FROM "process_versions"
        WHERE "definitionId" = ${definitionIdPh} AND "status" = 'PUBLISHED'`,
      [definitionId],
    );
    const published = publishedRows[0];
    const targetDesignJson = JSON.stringify(template.designJson);
    if (published?.designJson === targetDesignJson) continue;

    const versionRows: Array<{ maxVersion: number | null }> = await queryRunner.query(
      `SELECT MAX("version") AS "maxVersion" FROM "process_versions"
        WHERE "definitionId" = ${definitionIdPh}`,
      [definitionId],
    );
    const nextVersion = Number(versionRows[0]?.maxVersion ?? 0) + 1;

    if (published) {
      const [updatedAtPh, idPh] = p(2);
      await queryRunner.query(
        `UPDATE "process_versions" SET "status" = 'RETIRED', "updatedAt" = ${updatedAtPh}
          WHERE "id" = ${idPh}`,
        [now, published.id],
      );
    }

    const insertPh = p(9);
    await queryRunner.query(
      `INSERT INTO "process_versions"
        ("id", "definitionId", "version", "status", "designJson", "changeNote",
         "createdBy", "updatedBy", "publishedAt")
        VALUES (${insertPh.join(', ')})`,
      [
        randomUUID(),
        definitionId,
        nextVersion,
        'PUBLISHED',
        targetDesignJson,
        changeNote,
        'system',
        'system',
        now,
      ],
    );
  }
}

/**
 * 2026 年流程细化：请示批复链路调整，合同审批引入「人工选择下一步」，
 * 并确保外部律师角色与零星采买发起人授权到位。
 */
/**
 * 零星采买发起人限定：新建发起人角色并授予四位经办人，
 * 同时从其它角色收回 PETTY_CREATE，确保只有指定人员可以发起。
 */
export async function applyPettyRequesterRestriction(
  queryRunner: QueryRunner,
  dialect: Dialect,
): Promise<void> {
  const conflictClause = dialect === 'postgres' ? 'ON CONFLICT DO NOTHING' : '';
  const insertVerb = dialect === 'postgres' ? 'INSERT INTO' : 'INSERT OR IGNORE INTO';
  const p = (count: number) => placeholders(dialect, count);
  const [roleId, roleCode, roleName] = PETTY_REQUESTER_ROLE;

  await queryRunner.query(
    `${insertVerb} "iam_roles" ("id", "code", "name", "description", "active")
      VALUES ('${roleId}', '${roleCode}', '${roleName}', '仅限指定经办人发起零星采买', true) ${conflictClause}`,
  );
  const permissionList = PETTY_REQUESTER_PERMISSION_CODES.map((code) => `'${code}'`).join(', ');
  await queryRunner.query(
    `${insertVerb} "iam_role_permissions" ("roleId", "permissionId")
      SELECT '${roleId}', "id" FROM "iam_permissions"
        WHERE "code" IN (${permissionList}) ${conflictClause}`,
  );

  for (const userId of PETTY_REQUESTER_USER_IDS) {
    const [idPh, userIdPh, roleIdPh, existsPh] = p(4);
    await queryRunner.query(
      `INSERT INTO "iam_user_roles" ("id", "userId", "roleId", "dataScope", "scopeDepartmentId")
        SELECT ${idPh}, ${userIdPh}, ${roleIdPh}, 'SELF', NULL
        WHERE EXISTS (SELECT 1 FROM "users" WHERE "id" = ${existsPh})
        ${dialect === 'postgres' ? 'ON CONFLICT DO NOTHING' : ''}`,
      [randomUUID(), userId, roleId, userId],
    );
  }

  for (const revokedRoleId of PETTY_CREATE_REVOKED_ROLES) {
    const [rolePh, permissionPh] = p(2);
    await queryRunner.query(
      `DELETE FROM "iam_role_permissions"
        WHERE "roleId" = ${rolePh}
          AND "permissionId" IN (SELECT "id" FROM "iam_permissions" WHERE "code" = ${permissionPh})`,
      [revokedRoleId, 'PETTY_CREATE'],
    );
  }
}

/**
 * 业务中心菜单重构：请示批复与合同审批拆分为两个入口，印章菜单更名，
 * 新增公司通知入口，并按新的顺序重排业务中心。
 */
export async function applyBusinessMenuRestructure(queryRunner: QueryRunner): Promise<void> {
  await queryRunner.query(
    `UPDATE "iam_menus" SET "name" = '印章证照' WHERE "id" = 'menu-seal'`,
  );

  // 拆分「合同与支出」：保留原有角色授权到两个新入口
  await queryRunner.query(
    `DELETE FROM "iam_menus" WHERE "id" IN ('menu-request', 'menu-contract-approval')`,
  );
  await queryRunner.query(
    `INSERT INTO "iam_menus" ("id", "parentId", "name", "type", "path", "permissionCode", "icon", "orderNum", "visible", "active")
      SELECT 'menu-requests', 'menu-business', '请示批复', 'MENU', '/requests', 'DOCUMENT_VIEW,CONTRACT_VIEW', 'EditPen', 1, 1, 1
      WHERE NOT EXISTS (SELECT 1 FROM "iam_menus" WHERE "id" = 'menu-requests')`,
  );
  await queryRunner.query(
    `INSERT INTO "iam_menus" ("id", "parentId", "name", "type", "path", "permissionCode", "icon", "orderNum", "visible", "active")
      SELECT 'menu-contract-approvals', 'menu-business', '合同审批', 'MENU', '/contract-approvals', 'DOCUMENT_VIEW,CONTRACT_VIEW', 'Tickets', 2, 1, 1
      WHERE NOT EXISTS (SELECT 1 FROM "iam_menus" WHERE "id" = 'menu-contract-approvals')`,
  );
  await queryRunner.query(
    `INSERT INTO "iam_role_menus" ("roleId", "menuId")
      SELECT "roleId", 'menu-requests' FROM "iam_role_menus" WHERE "menuId" = 'menu-contract'
        AND NOT EXISTS (
          SELECT 1 FROM "iam_role_menus" existing
          WHERE existing."roleId" = "iam_role_menus"."roleId" AND existing."menuId" = 'menu-requests'
        )`,
  );
  await queryRunner.query(
    `INSERT INTO "iam_role_menus" ("roleId", "menuId")
      SELECT "roleId", 'menu-contract-approvals' FROM "iam_role_menus" WHERE "menuId" = 'menu-contract'
        AND NOT EXISTS (
          SELECT 1 FROM "iam_role_menus" existing
          WHERE existing."roleId" = "iam_role_menus"."roleId" AND existing."menuId" = 'menu-contract-approvals'
        )`,
  );
  await queryRunner.query(`DELETE FROM "iam_role_menus" WHERE "menuId" = 'menu-contract'`);
  await queryRunner.query(`DELETE FROM "iam_menus" WHERE "id" = 'menu-contract'`);

  // 公司通知：与公司门户相同的可见范围
  await queryRunner.query(
    `INSERT INTO "iam_menus" ("id", "parentId", "name", "type", "path", "permissionCode", "icon", "orderNum", "visible", "active")
      SELECT 'menu-notices', 'menu-business', '公司通知', 'MENU', '/notices', 'PORTAL_VIEW,CONTENT_VIEW', 'Bell', 6, 1, 1
      WHERE NOT EXISTS (SELECT 1 FROM "iam_menus" WHERE "id" = 'menu-notices')`,
  );
  await queryRunner.query(
    `INSERT INTO "iam_role_menus" ("roleId", "menuId")
      SELECT role."id", 'menu-notices' FROM "iam_roles" role
        WHERE NOT EXISTS (
          SELECT 1 FROM "iam_role_menus" existing
          WHERE existing."roleId" = role."id" AND existing."menuId" = 'menu-notices'
        )`,
  );

  for (const [menuId, orderNum] of [
    ['menu-seal', 3],
    ['menu-purchase', 4],
    ['menu-petty', 5],
    ['menu-supply', 7],
    ['menu-content', 8],
    ['menu-petty-materials', 9],
  ] as const) {
    await queryRunner.query(
      `UPDATE "iam_menus" SET "orderNum" = ${orderNum} WHERE "id" = '${menuId}'`,
    );
  }
}

export async function applyManualChoiceChainAdjustment(
  queryRunner: QueryRunner,
  dialect: Dialect,
): Promise<void> {
  const conflictClause = dialect === 'postgres' ? 'ON CONFLICT DO NOTHING' : '';
  const insertVerb = dialect === 'postgres' ? 'INSERT INTO' : 'INSERT OR IGNORE INTO';

  const [roleId, roleCode, roleName] = LEGAL_ADVISOR_ROLE;
  await queryRunner.query(
    `${insertVerb} "iam_roles" ("id", "code", "name", "description", "active")
      VALUES ('${roleId}', '${roleCode}', '${roleName}', '合同审批中由行政办公室指派的外部律师审核人', true) ${conflictClause}`,
  );
  await queryRunner.query(
    `${insertVerb} "iam_role_permissions" ("roleId", "permissionId")
      SELECT '${roleId}', "permissionId" FROM "iam_role_permissions"
        WHERE "roleId" = 'role-exec-pre-approver' ${conflictClause}`,
  );

  await republishCatalogChains(queryRunner, dialect, REFINED_DOCUMENT_TYPES, '2026 请示批复与合同审批链路细化');
}

export async function applyHotelApprovalChainAdjustment(
  queryRunner: QueryRunner,
  dialect: Dialect,
): Promise<void> {
  const p = (count: number) => placeholders(dialect, count);

  for (const [code, name] of ROLE_NAME_UPDATES) {
    const [namePh, codePh] = p(2);
    await queryRunner.query(`UPDATE "iam_roles" SET "name" = ${namePh} WHERE "code" = ${codePh}`, [
      name,
      code,
    ]);
  }

  const conflictClause = dialect === 'postgres' ? 'ON CONFLICT DO NOTHING' : '';
  const insertVerb = dialect === 'postgres' ? 'INSERT INTO' : 'INSERT OR IGNORE INTO';
  for (const [roleId, permissionId] of ROLE_PERMISSION_GRANTS) {
    const [rolePh, permissionPh] = p(2);
    await queryRunner.query(
      `${insertVerb} "iam_role_permissions" ("roleId", "permissionId")
        VALUES (${rolePh}, ${permissionPh}) ${conflictClause}`,
      [roleId, permissionId],
    );
  }

  await republishCatalogChains(
    queryRunner,
    dialect,
    ADJUSTED_DOCUMENT_TYPES,
    '2026 酒店审批链路调整',
  );
}
