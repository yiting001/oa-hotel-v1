import { MigrationInterface, QueryRunner } from 'typeorm';

export class WorkflowEnterpriseFoundation1783944000200 implements MigrationInterface {
  name = 'WorkflowEnterpriseFoundation1783944000200';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "document_indexes" ADD COLUMN "processVersionId" text`);
    await queryRunner.query(`ALTER TABLE "document_indexes" ADD COLUMN "formVersionId" text`);
    await queryRunner.query(`ALTER TABLE "workflow_tasks" ADD COLUMN "processNodeId" text`);
    await queryRunner.query(
      `ALTER TABLE "workflow_tasks" ADD COLUMN "assigneeType" text NOT NULL DEFAULT ('ROLE')`,
    );
    await queryRunner.query(`ALTER TABLE "workflow_tasks" ADD COLUMN "assigneeValue" text`);
    await queryRunner.query(`ALTER TABLE "workflow_opinions" ADD COLUMN "actorDepartmentId" text`);
    await queryRunner.query(
      `ALTER TABLE "workflow_opinions" ADD COLUMN "actorDepartmentName" text`,
    );
    await queryRunner.query(`ALTER TABLE "workflow_opinions" ADD COLUMN "actorPositionId" text`);
    await queryRunner.query(`ALTER TABLE "workflow_opinions" ADD COLUMN "actorPositionName" text`);
    await queryRunner.query(`ALTER TABLE "workflow_opinions" ADD COLUMN "processNodeId" text`);
    await queryRunner.query(`ALTER TABLE "workflow_opinions" ADD COLUMN "processNodeName" text`);
    await queryRunner.query(
      `CREATE TABLE "workflow_task_candidates" (
        "id" text PRIMARY KEY NOT NULL,
        "taskId" text NOT NULL,
        "userId" text NOT NULL,
        "source" text NOT NULL,
        "roleCode" text,
        "departmentId" text,
        CONSTRAINT "FK_task_candidate_task" FOREIGN KEY ("taskId") REFERENCES "workflow_tasks" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_task_candidate_user" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT,
        CONSTRAINT "UQ_task_candidate" UNIQUE ("taskId", "userId")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_task_candidate_task" ON "workflow_task_candidates" ("taskId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_task_candidate_user" ON "workflow_task_candidates" ("userId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_task_candidate_user"`);
    await queryRunner.query(`DROP INDEX "IDX_task_candidate_task"`);
    await queryRunner.query(`DROP TABLE "workflow_task_candidates"`);
    await queryRunner.query(`ALTER TABLE "workflow_opinions" DROP COLUMN "processNodeName"`);
    await queryRunner.query(`ALTER TABLE "workflow_opinions" DROP COLUMN "processNodeId"`);
    await queryRunner.query(`ALTER TABLE "workflow_opinions" DROP COLUMN "actorPositionName"`);
    await queryRunner.query(`ALTER TABLE "workflow_opinions" DROP COLUMN "actorPositionId"`);
    await queryRunner.query(`ALTER TABLE "workflow_opinions" DROP COLUMN "actorDepartmentName"`);
    await queryRunner.query(`ALTER TABLE "workflow_opinions" DROP COLUMN "actorDepartmentId"`);
    await queryRunner.query(`ALTER TABLE "workflow_tasks" DROP COLUMN "assigneeValue"`);
    await queryRunner.query(`ALTER TABLE "workflow_tasks" DROP COLUMN "assigneeType"`);
    await queryRunner.query(`ALTER TABLE "workflow_tasks" DROP COLUMN "processNodeId"`);
    await queryRunner.query(`ALTER TABLE "document_indexes" DROP COLUMN "formVersionId"`);
    await queryRunner.query(`ALTER TABLE "document_indexes" DROP COLUMN "processVersionId"`);
  }
}
