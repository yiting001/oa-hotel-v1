import type { MigrationInterface, QueryRunner } from 'typeorm';

/** Creates the isolated form-definition and immutable-version persistence model. */
export class FormDesign1783944000001 implements MigrationInterface {
  name = 'FormDesign1783944000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "form_definitions" ("id" text PRIMARY KEY NOT NULL, "code" text NOT NULL, "name" text NOT NULL, "description" text, "documentType" text, "active" boolean NOT NULL DEFAULT (1), "createdBy" text NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_form_definitions_code" UNIQUE ("code"), CONSTRAINT "UQ_form_definitions_document_type" UNIQUE ("documentType"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "form_versions" ("id" text PRIMARY KEY NOT NULL, "definitionId" text NOT NULL, "version" integer NOT NULL, "status" text NOT NULL, "schemaJson" text NOT NULL, "printSchemaJson" text NOT NULL, "changeNote" text, "createdBy" text NOT NULL, "updatedBy" text NOT NULL, "publishedAt" datetime, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')), CONSTRAINT "UQ_form_versions_definition_version" UNIQUE ("definitionId", "version"), CONSTRAINT "CK_form_versions_number" CHECK ("version" >= 1), CONSTRAINT "CK_form_versions_status" CHECK ("status" IN ('DRAFT', 'PUBLISHED', 'RETIRED')), CONSTRAINT "FK_form_versions_definition" FOREIGN KEY ("definitionId") REFERENCES "form_definitions" ("id") ON DELETE RESTRICT ON UPDATE NO ACTION)`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_form_versions_definition" ON "form_versions" ("definitionId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_form_versions_status" ON "form_versions" ("status")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_form_versions_one_published" ON "form_versions" ("definitionId") WHERE "status" = 'PUBLISHED'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_form_versions_one_published"`);
    await queryRunner.query(`DROP INDEX "IDX_form_versions_status"`);
    await queryRunner.query(`DROP INDEX "IDX_form_versions_definition"`);
    await queryRunner.query(`DROP TABLE "form_versions"`);
    await queryRunner.query(`DROP TABLE "form_definitions"`);
  }
}
