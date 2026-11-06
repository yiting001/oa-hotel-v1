import type { MigrationInterface, QueryRunner } from 'typeorm';
import { applyBusinessCenterMenuRefinement } from '../hotel-approval-chain-2026';

/** 业务中心菜单细化与单据附件上传（PostgreSQL）：附件表 + 印章/证照拆分入口 + 零星采买合并。 */
export class PostgresBusinessCenterRefinement1786900000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "document_attachments" (
        "id" text PRIMARY KEY,
        "fileName" text NOT NULL,
        "storedName" text NOT NULL,
        "mimeType" text NOT NULL,
        "sizeBytes" integer NOT NULL DEFAULT 0,
        "uploaderId" text NOT NULL,
        "uploaderName" text NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_document_attachments_uploader" ON "document_attachments" ("uploaderId")`,
    );
    await applyBusinessCenterMenuRefinement(queryRunner, 'postgres');
  }

  async down(): Promise<void> {
    // 保留已上传附件与菜单调整，避免误删业务数据。
  }
}
