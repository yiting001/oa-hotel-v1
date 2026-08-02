import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Adds the read-optimized portal model without coupling it to workflow aggregates. */
export class PortalReadModel1784200000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT OR IGNORE INTO "iam_permissions"
        ("id", "code", "name", "module", "description", "active")
        VALUES
          ('permission-portal-view', 'PORTAL_VIEW', '查看公司门户', 'PORTAL', '查看公司门户布局、日历和常用入口', 1),
          ('permission-content-view', 'CONTENT_VIEW', '查看门户内容', 'CONTENT', '查看符合受众范围的公司信息', 1)`,
    );
    await queryRunner.query(
      `INSERT OR IGNORE INTO "iam_role_permissions" ("roleId", "permissionId")
        SELECT "id", 'permission-portal-view' FROM "iam_roles"`,
    );
    await queryRunner.query(
      `INSERT OR IGNORE INTO "iam_role_permissions" ("roleId", "permissionId")
        SELECT "id", 'permission-content-view' FROM "iam_roles"`,
    );
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
        "publishedAt" datetime NOT NULL,
        "offlineAt" datetime,
        "active" boolean NOT NULL DEFAULT (1),
        CONSTRAINT "CK_portal_content_audience" CHECK ("audienceType" IN ('ALL', 'DEPARTMENT', 'ROLE', 'USER')),
        CONSTRAINT "CK_portal_content_category" CHECK ("category" IN ('MEETING_MINUTES', 'MEMO', 'NOTICE', 'POLICY', 'COMPANY_NEWS', 'PARTY_WORK'))
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_portal_content_category" ON "portal_contents" ("category")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_portal_content_audience" ON "portal_contents" ("audienceType")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_portal_content_published" ON "portal_contents" ("publishedAt")`,
    );
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
    await queryRunner.query(
      `CREATE TABLE "portal_calendar_events" (
        "id" text PRIMARY KEY NOT NULL,
        "title" text NOT NULL,
        "startAt" datetime NOT NULL,
        "endAt" datetime NOT NULL,
        "allDay" boolean NOT NULL DEFAULT (0),
        "location" text,
        "kind" text NOT NULL,
        "displayOrder" integer NOT NULL DEFAULT (0),
        "active" boolean NOT NULL DEFAULT (1)
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_portal_event_start" ON "portal_calendar_events" ("startAt")`,
    );
    await queryRunner.query(
      `CREATE TABLE "portal_quick_links" (
        "id" text PRIMARY KEY NOT NULL,
        "title" text NOT NULL,
        "url" text NOT NULL,
        "icon" text NOT NULL,
        "requiredPermissionCodes" text NOT NULL DEFAULT ('[]'),
        "displayOrder" integer NOT NULL DEFAULT (0),
        "active" boolean NOT NULL DEFAULT (1)
      )`,
    );
    await queryRunner.query(
      `CREATE TABLE "portal_widgets" (
        "ownerId" text NOT NULL,
        "widgetKey" text NOT NULL,
        "title" text NOT NULL,
        "displayOrder" integer NOT NULL DEFAULT (0),
        "visible" boolean NOT NULL DEFAULT (1),
        PRIMARY KEY ("ownerId", "widgetKey")
      )`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "portal_widgets"`);
    await queryRunner.query(`DROP TABLE "portal_quick_links"`);
    await queryRunner.query(`DROP INDEX "IDX_portal_event_start"`);
    await queryRunner.query(`DROP TABLE "portal_calendar_events"`);
    await queryRunner.query(`DROP INDEX "IDX_portal_receipt_user_read"`);
    await queryRunner.query(`DROP TABLE "portal_read_receipts"`);
    await queryRunner.query(`DROP INDEX "IDX_portal_content_published"`);
    await queryRunner.query(`DROP INDEX "IDX_portal_content_audience"`);
    await queryRunner.query(`DROP INDEX "IDX_portal_content_category"`);
    await queryRunner.query(`DROP TABLE "portal_contents"`);
    await queryRunner.query(
      `DELETE FROM "iam_role_permissions" WHERE "permissionId" IN ('permission-portal-view', 'permission-content-view')`,
    );
    await queryRunner.query(
      `DELETE FROM "iam_permissions" WHERE "id" IN ('permission-portal-view', 'permission-content-view')`,
    );
  }
}
