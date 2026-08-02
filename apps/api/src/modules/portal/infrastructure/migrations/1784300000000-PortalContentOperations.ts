import type { MigrationInterface, QueryRunner } from 'typeorm';

const CONTENT_MANAGE_PERMISSION_ID = 'permission-content-manage';

/** Adds governed content authoring while preserving the audience-filtered portal read model. */
export class PortalContentOperations1784300000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await this.addContentManagementPermission(queryRunner);
    await this.rebuildContentTables(queryRunner);
    await this.createHistoryTables(queryRunner);
    await this.backfillHistory(queryRunner);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_portal_audit_occurred"`);
    await queryRunner.query(`DROP INDEX "IDX_portal_audit_content"`);
    await queryRunner.query(`DROP TABLE "portal_content_audits"`);
    await queryRunner.query(`DROP INDEX "IDX_portal_revision_content"`);
    await queryRunner.query(`DROP TABLE "portal_content_revisions"`);
    await this.restoreReadModelTables(queryRunner);
    await queryRunner.query(`DELETE FROM "iam_role_permissions" WHERE "permissionId" = ?`, [
      CONTENT_MANAGE_PERMISSION_ID,
    ]);
    await queryRunner.query(`DELETE FROM "iam_permissions" WHERE "id" = ?`, [
      CONTENT_MANAGE_PERMISSION_ID,
    ]);
  }

  private async addContentManagementPermission(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT OR IGNORE INTO "iam_permissions"
        ("id", "code", "name", "module", "description", "active")
        VALUES (?, 'CONTENT_MANAGE', '管理门户内容', 'CONTENT', '创建、编辑、发布、撤回门户内容并查看审计记录', 1)`,
      [CONTENT_MANAGE_PERMISSION_ID],
    );
    for (const roleId of ['role-system-admin', 'role-office-reviewer']) {
      await queryRunner.query(
        `INSERT OR IGNORE INTO "iam_role_permissions" ("roleId", "permissionId")
          SELECT "id", ? FROM "iam_roles" WHERE "id" = ?`,
        [CONTENT_MANAGE_PERMISSION_ID, roleId],
      );
    }
  }

  private async rebuildContentTables(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "portal_read_receipts" RENAME TO "portal_read_receipts_legacy"`,
    );
    await queryRunner.query(`ALTER TABLE "portal_contents" RENAME TO "portal_contents_legacy"`);
    await queryRunner.query(`DROP INDEX "IDX_portal_receipt_user_read"`);
    await queryRunner.query(`DROP INDEX "IDX_portal_content_published"`);
    await queryRunner.query(`DROP INDEX "IDX_portal_content_audience"`);
    await queryRunner.query(`DROP INDEX "IDX_portal_content_category"`);
    await this.createContentTable(queryRunner);
    await queryRunner.query(
      `INSERT INTO "portal_contents" (
        "id", "category", "title", "summary", "body", "publisherId", "publisherName",
        "publisherDepartmentId", "publisherDepartmentName", "audienceType", "audienceIds",
        "pinned", "requiresReceipt", "coverImageUrl", "attachments", "status",
        "currentRevision", "publishedAt", "offlineAt", "withdrawnAt", "createdAt", "updatedAt"
      ) SELECT
        "id", "category", "title", "summary", "body", "publisherId", "publisherName",
        "publisherDepartmentId", "publisherDepartmentName", "audienceType", "audienceIds",
        "pinned", "requiresReceipt", "coverImageUrl", "attachments",
        CASE WHEN "active" = 1 THEN 'PUBLISHED' ELSE 'WITHDRAWN' END, 1,
        "publishedAt", "offlineAt", CASE WHEN "active" = 1 THEN NULL ELSE "publishedAt" END,
        "publishedAt", "publishedAt"
      FROM "portal_contents_legacy"`,
    );
    await this.createReceiptTable(queryRunner);
    await queryRunner.query(
      `INSERT INTO "portal_read_receipts" ("contentId", "userId", "readAt")
        SELECT "contentId", "userId", "readAt" FROM "portal_read_receipts_legacy"`,
    );
    await queryRunner.query(`DROP TABLE "portal_read_receipts_legacy"`);
    await queryRunner.query(`DROP TABLE "portal_contents_legacy"`);
  }

  private async createContentTable(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "portal_contents" (
        "id" text PRIMARY KEY NOT NULL,
        "category" text NOT NULL,
        "title" text NOT NULL,
        "summary" text NOT NULL,
        "body" text NOT NULL,
        "publisherId" text NOT NULL,
        "publisherName" text NOT NULL,
        "publisherDepartmentId" text,
        "publisherDepartmentName" text,
        "audienceType" text NOT NULL,
        "audienceIds" text NOT NULL,
        "pinned" boolean NOT NULL DEFAULT (0),
        "requiresReceipt" boolean NOT NULL DEFAULT (0),
        "coverImageUrl" text,
        "attachments" text NOT NULL,
        "status" text NOT NULL DEFAULT ('DRAFT'),
        "currentRevision" integer NOT NULL DEFAULT (1),
        "publishedAt" datetime,
        "offlineAt" datetime,
        "withdrawnAt" datetime,
        "createdAt" datetime NOT NULL,
        "updatedAt" datetime NOT NULL,
        CONSTRAINT "CK_portal_content_audience" CHECK ("audienceType" IN ('ALL', 'DEPARTMENT', 'ROLE', 'USER')),
        CONSTRAINT "CK_portal_content_category" CHECK ("category" IN ('MEETING_MINUTES', 'MEMO', 'NOTICE', 'POLICY', 'COMPANY_NEWS', 'PARTY_WORK', 'EVENT')),
        CONSTRAINT "CK_portal_content_status" CHECK ("status" IN ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'WITHDRAWN'))
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_portal_content_category" ON "portal_contents" ("category")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_portal_content_audience" ON "portal_contents" ("audienceType")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_portal_content_status" ON "portal_contents" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_portal_content_published" ON "portal_contents" ("publishedAt")`,
    );
  }

  private async createReceiptTable(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "portal_read_receipts" (
        "contentId" text NOT NULL,
        "userId" text NOT NULL,
        "readAt" datetime NOT NULL,
        PRIMARY KEY ("contentId", "userId"),
        CONSTRAINT "FK_portal_receipt_content" FOREIGN KEY ("contentId") REFERENCES "portal_contents" ("id") ON DELETE CASCADE
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_portal_receipt_user_read" ON "portal_read_receipts" ("userId", "readAt")`,
    );
  }

  private async createHistoryTables(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "portal_content_revisions" (
        "id" text PRIMARY KEY NOT NULL,
        "contentId" text NOT NULL,
        "revision" integer NOT NULL,
        "snapshot" text NOT NULL,
        "createdAt" datetime NOT NULL,
        CONSTRAINT "UQ_portal_content_revision" UNIQUE ("contentId", "revision"),
        CONSTRAINT "FK_portal_revision_content" FOREIGN KEY ("contentId") REFERENCES "portal_contents" ("id") ON DELETE CASCADE
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_portal_revision_content" ON "portal_content_revisions" ("contentId")`,
    );
    await queryRunner.query(
      `CREATE TABLE "portal_content_audits" (
        "id" text PRIMARY KEY NOT NULL,
        "contentId" text NOT NULL,
        "action" text NOT NULL,
        "actorId" text NOT NULL,
        "actorName" text NOT NULL,
        "actorDepartmentName" text,
        "revision" integer NOT NULL,
        "occurredAt" datetime NOT NULL,
        "details" text NOT NULL,
        CONSTRAINT "FK_portal_audit_content" FOREIGN KEY ("contentId") REFERENCES "portal_contents" ("id") ON DELETE CASCADE
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_portal_audit_content" ON "portal_content_audits" ("contentId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_portal_audit_occurred" ON "portal_content_audits" ("occurredAt")`,
    );
  }

  private async backfillHistory(queryRunner: QueryRunner): Promise<void> {
    const snapshot = `json_object(
      'id', "id", 'category', "category", 'title', "title", 'summary', "summary", 'body', "body",
      'publisherId', "publisherId", 'publisherName', "publisherName",
      'publisherDepartmentId', "publisherDepartmentId", 'publisherDepartmentName', "publisherDepartmentName",
      'audienceType', "audienceType", 'audienceIds', json("audienceIds"), 'pinned', json("pinned"),
      'requiresReceipt', json("requiresReceipt"), 'coverImageUrl', "coverImageUrl",
      'attachments', json("attachments"), 'status', "status", 'publishedAt', "publishedAt",
      'offlineAt', "offlineAt", 'withdrawnAt', "withdrawnAt"
    )`;
    await queryRunner.query(
      `INSERT INTO "portal_content_revisions" ("id", "contentId", "revision", "snapshot", "createdAt")
        SELECT 'migration-revision-' || "id", "id", 1, ${snapshot}, "createdAt" FROM "portal_contents"`,
    );
    await queryRunner.query(
      `INSERT INTO "portal_content_audits"
        ("id", "contentId", "action", "actorId", "actorName", "actorDepartmentName", "revision", "occurredAt", "details")
        SELECT 'migration-audit-' || "id", "id", 'CREATED', 'SYSTEM', '系统迁移', NULL, 1, "createdAt", '{}'
        FROM "portal_contents"`,
    );
  }

  private async restoreReadModelTables(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "portal_read_receipts" RENAME TO "portal_read_receipts_current"`,
    );
    await queryRunner.query(`ALTER TABLE "portal_contents" RENAME TO "portal_contents_current"`);
    await queryRunner.query(`DROP INDEX "IDX_portal_receipt_user_read"`);
    await queryRunner.query(`DROP INDEX "IDX_portal_content_published"`);
    await queryRunner.query(`DROP INDEX "IDX_portal_content_status"`);
    await queryRunner.query(`DROP INDEX "IDX_portal_content_audience"`);
    await queryRunner.query(`DROP INDEX "IDX_portal_content_category"`);
    await queryRunner.query(
      `CREATE TABLE "portal_contents" (
        "id" text PRIMARY KEY NOT NULL, "category" text NOT NULL, "title" text NOT NULL,
        "summary" text NOT NULL, "body" text NOT NULL, "publisherId" text NOT NULL,
        "publisherName" text NOT NULL, "publisherDepartmentId" text, "publisherDepartmentName" text,
        "audienceType" text NOT NULL, "audienceIds" text NOT NULL, "pinned" boolean NOT NULL DEFAULT (0),
        "requiresReceipt" boolean NOT NULL DEFAULT (0), "coverImageUrl" text, "attachments" text NOT NULL,
        "publishedAt" datetime NOT NULL, "offlineAt" datetime, "active" boolean NOT NULL DEFAULT (1)
      )`,
    );
    await queryRunner.query(
      `INSERT INTO "portal_contents"
        SELECT "id", CASE WHEN "category" = 'EVENT' THEN 'COMPANY_NEWS' ELSE "category" END,
          "title", "summary", "body", "publisherId", "publisherName", "publisherDepartmentId",
          "publisherDepartmentName", "audienceType", "audienceIds", "pinned", "requiresReceipt",
          "coverImageUrl", "attachments", COALESCE("publishedAt", "createdAt"), "offlineAt",
          CASE WHEN "status" = 'WITHDRAWN' THEN 0 ELSE 1 END
        FROM "portal_contents_current"`,
    );
    await this.createReceiptTable(queryRunner);
    await queryRunner.query(
      `INSERT INTO "portal_read_receipts" SELECT "contentId", "userId", "readAt" FROM "portal_read_receipts_current"`,
    );
    await queryRunner.query(`DROP TABLE "portal_read_receipts_current"`);
    await queryRunner.query(`DROP TABLE "portal_contents_current"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_portal_content_category" ON "portal_contents" ("category")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_portal_content_audience" ON "portal_contents" ("audienceType")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_portal_content_published" ON "portal_contents" ("publishedAt")`,
    );
  }
}
