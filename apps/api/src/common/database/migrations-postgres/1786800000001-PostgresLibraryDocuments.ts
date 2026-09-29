import type { MigrationInterface, QueryRunner } from 'typeorm';
import { applyBusinessMenuRestructure } from '../hotel-approval-chain-2026';

const permissions = [
  ['permission-library-view', 'LIBRARY_VIEW', '查看公司文件制度', 'LIBRARY'],
  ['permission-library-manage', 'LIBRARY_MANAGE', '维护公司文件制度', 'LIBRARY'],
] as const;

/** 公司文件制度（文档库）：建表、权限与菜单入口。 */
export class PostgresLibraryDocuments1786800000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "library_documents" (
        "id" text PRIMARY KEY,
        "title" text NOT NULL,
        "category" text NOT NULL,
        "description" text NOT NULL DEFAULT '',
        "fileName" text NOT NULL,
        "storedName" text NOT NULL,
        "mimeType" text NOT NULL,
        "sizeBytes" integer NOT NULL DEFAULT 0,
        "uploaderId" text NOT NULL,
        "uploaderName" text NOT NULL,
        "downloadCount" integer NOT NULL DEFAULT 0,
        "createdAt" timestamptz NOT NULL DEFAULT now(),
        "updatedAt" timestamptz NOT NULL DEFAULT now()
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_library_documents_category" ON "library_documents" ("category")`,
    );
    for (const [id, code, name, module] of permissions) {
      await queryRunner.query(
        `INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active")
          VALUES ($1, $2, $3, $4, NULL, true) ON CONFLICT DO NOTHING`,
        [id, code, name, module],
      );
    }
    // 已有查看单据权限的角色都可查看文件库；文件维护留给系统管理员
    await queryRunner.query(
      `INSERT INTO "iam_role_permissions" ("roleId", "permissionId")
        SELECT DISTINCT rp."roleId", 'permission-library-view' FROM "iam_role_permissions" rp
         WHERE rp."permissionId" IN (SELECT "id" FROM "iam_permissions" WHERE "code" = 'DOCUMENT_VIEW')
        ON CONFLICT DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO "iam_role_permissions" ("roleId", "permissionId")
        VALUES ('role-system-admin', 'permission-library-view') ON CONFLICT DO NOTHING`,
    );
    await queryRunner.query(
      `INSERT INTO "iam_role_permissions" ("roleId", "permissionId")
        VALUES ('role-system-admin', 'permission-library-manage') ON CONFLICT DO NOTHING`,
    );
    await applyBusinessMenuRestructure(queryRunner, 'postgres');
  }

  async down(): Promise<void> {
    // 保留文件库数据与权限，避免误删已上传资料。
  }
}
