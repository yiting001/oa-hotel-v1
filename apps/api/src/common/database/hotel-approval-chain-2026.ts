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
export async function applyHotelApprovalChainAdjustment(
  queryRunner: QueryRunner,
  dialect: Dialect,
): Promise<void> {
  const p = (count: number) => placeholders(dialect, count);
  const now = new Date().toISOString();

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

  for (const documentType of ADJUSTED_DOCUMENT_TYPES) {
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
        '2026 酒店审批链路调整',
        'system',
        'system',
        now,
      ],
    );
  }
}
