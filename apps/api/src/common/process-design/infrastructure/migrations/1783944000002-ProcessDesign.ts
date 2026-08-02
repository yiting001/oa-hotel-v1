import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Creates the isolated process-definition and immutable-version persistence model. */
export class ProcessDesign1783944000002 implements MigrationInterface {
  name = 'ProcessDesign1783944000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "process_definitions" ("id" text PRIMARY KEY NOT NULL, "code" text NOT NULL, "name" text NOT NULL, "description" text, "documentType" text, "active" boolean NOT NULL DEFAULT (1), "createdBy" text NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_process_definitions_code" UNIQUE ("code"), CONSTRAINT "UQ_process_definitions_document_type" UNIQUE ("documentType"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "process_versions" ("id" text PRIMARY KEY NOT NULL, "definitionId" text NOT NULL, "version" integer NOT NULL, "status" text NOT NULL, "designJson" text NOT NULL, "changeNote" text, "createdBy" text NOT NULL, "updatedBy" text NOT NULL, "publishedAt" datetime, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_process_versions_definition_version" UNIQUE ("definitionId", "version"), CONSTRAINT "CK_process_versions_number" CHECK ("version" >= 1), CONSTRAINT "CK_process_versions_status" CHECK ("status" IN ('DRAFT', 'PUBLISHED', 'RETIRED')), CONSTRAINT "FK_process_versions_definition" FOREIGN KEY ("definitionId") REFERENCES "process_definitions" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_process_versions_definition" ON "process_versions" ("definitionId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_process_versions_status" ON "process_versions" ("status")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_process_versions_one_published" ON "process_versions" ("definitionId") WHERE "status" = 'PUBLISHED'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_process_versions_one_published"`);
    await queryRunner.query(`DROP INDEX "IDX_process_versions_status"`);
    await queryRunner.query(`DROP INDEX "IDX_process_versions_definition"`);
    await queryRunner.query(`DROP TABLE "process_versions"`);
    await queryRunner.query(`DROP TABLE "process_definitions"`);
  }
}
