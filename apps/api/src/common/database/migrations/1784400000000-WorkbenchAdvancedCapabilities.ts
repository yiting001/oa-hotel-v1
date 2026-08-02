import type { MigrationInterface, QueryRunner } from 'typeorm';

const permissions = [
  [
    'permission-document-follow',
    'DOCUMENT_FOLLOW',
    '关注业务单据',
    'DOCUMENT',
    '关注当前可见单据并在个人工作台持续跟踪',
  ],
  [
    'permission-workflow-copy',
    'WORKFLOW_COPY',
    '抄送业务单据',
    'WORKFLOW',
    '向具有目标单据查看范围的人员发送工作流抄送',
  ],
  [
    'permission-workflow-batch-approve',
    'WORKFLOW_BATCH_APPROVE',
    '批量同意审批',
    'WORKFLOW',
    '对本人当前可办理的兼容任务执行逐项批量同意',
  ],
] as const;

export class WorkbenchAdvancedCapabilities1784400000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    for (const permission of permissions) {
      await queryRunner.query(
        `INSERT OR IGNORE INTO "iam_permissions"
          ("id", "code", "name", "module", "description", "active")
          VALUES (?, ?, ?, ?, ?, 1)`,
        [...permission],
      );
    }
    await this.grantByExistingPermission(
      queryRunner,
      'permission-document-follow',
      'permission-document-view',
    );
    await this.grantByExistingPermission(
      queryRunner,
      'permission-workflow-copy',
      'permission-document-view',
    );
    await this.grantByExistingPermission(
      queryRunner,
      'permission-workflow-batch-approve',
      'permission-workflow-approve',
    );

    await queryRunner.query(
      `CREATE TABLE "document_follows" (
        "documentId" text NOT NULL,
        "userId" text NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY ("documentId", "userId"),
        CONSTRAINT "FK_document_follow_document" FOREIGN KEY ("documentId") REFERENCES "document_indexes" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_document_follow_user" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_document_follow_user_created" ON "document_follows" ("userId", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE TABLE "workflow_copies" (
        "id" text PRIMARY KEY NOT NULL,
        "documentId" text NOT NULL,
        "senderId" text NOT NULL,
        "senderName" text NOT NULL,
        "recipientId" text NOT NULL,
        "recipientName" text NOT NULL,
        "readAt" datetime,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_workflow_copy_document" FOREIGN KEY ("documentId") REFERENCES "document_indexes" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workflow_copy_sender" FOREIGN KEY ("senderId") REFERENCES "users" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_workflow_copy_recipient" FOREIGN KEY ("recipientId") REFERENCES "users" ("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_workflow_copy_recipient" UNIQUE ("documentId", "recipientId")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_workflow_copy_document" ON "workflow_copies" ("documentId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_workflow_copy_recipient_read" ON "workflow_copies" ("recipientId", "readAt", "createdAt")`,
    );
    await queryRunner.query(
      `CREATE TABLE "workflow_batch_commands" (
        "requestId" text PRIMARY KEY NOT NULL,
        "actorId" text NOT NULL,
        "payloadHash" text NOT NULL,
        "resultJson" text NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_workflow_batch_actor" FOREIGN KEY ("actorId") REFERENCES "users" ("id") ON DELETE RESTRICT
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_workflow_batch_actor" ON "workflow_batch_commands" ("actorId")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_workflow_batch_actor"`);
    await queryRunner.query(`DROP TABLE "workflow_batch_commands"`);
    await queryRunner.query(`DROP INDEX "IDX_workflow_copy_recipient_read"`);
    await queryRunner.query(`DROP INDEX "IDX_workflow_copy_document"`);
    await queryRunner.query(`DROP TABLE "workflow_copies"`);
    await queryRunner.query(`DROP INDEX "IDX_document_follow_user_created"`);
    await queryRunner.query(`DROP TABLE "document_follows"`);
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

  private grantByExistingPermission(
    queryRunner: QueryRunner,
    permissionId: string,
    sourcePermissionId: string,
  ): Promise<unknown> {
    return queryRunner.query(
      `INSERT OR IGNORE INTO "iam_role_permissions" ("roleId", "permissionId")
       SELECT "roleId", ? FROM "iam_role_permissions" WHERE "permissionId" = ?`,
      [permissionId, sourcePermissionId],
    );
  }
}
