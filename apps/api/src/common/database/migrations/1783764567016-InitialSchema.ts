import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1783764567016 implements MigrationInterface {
  name = 'InitialSchema1783764567016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "departments" ("id" text PRIMARY KEY NOT NULL, "code" text NOT NULL, "name" text NOT NULL, "managerUserId" text, CONSTRAINT "UQ_91fddbe23e927e1e525c152baa3" UNIQUE ("code"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" text PRIMARY KEY NOT NULL, "username" text NOT NULL, "displayName" text NOT NULL, "passwordHash" text NOT NULL, "departmentId" text NOT NULL, "roleCodes" text NOT NULL, "active" boolean NOT NULL DEFAULT (1))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_fe0bb3f6520ee0469504521e71" ON "users" ("username") `,
    );
    await queryRunner.query(
      `CREATE TABLE "document_indexes" ("id" text PRIMARY KEY NOT NULL, "documentType" text NOT NULL, "module" text NOT NULL, "title" text NOT NULL, "applicantId" text NOT NULL, "departmentId" text NOT NULL, "status" text NOT NULL DEFAULT ('DRAFT'), "revision" integer NOT NULL DEFAULT (1), "currentStep" integer, "workflowCode" text NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6f3d3b05d2c5da678433247ecd" ON "document_indexes" ("documentType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5d1e53d99eb920630230c6c651" ON "document_indexes" ("module") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a7b3c5234ee91b06c766466755" ON "document_indexes" ("applicantId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a5d0c52cc6c08f2886830ea957" ON "document_indexes" ("departmentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f2f41183ea8fb0c9f6f91a7ecd" ON "document_indexes" ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "workflow_commands" ("requestId" text NOT NULL, "documentId" text NOT NULL, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), PRIMARY KEY ("requestId", "documentId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c42f4bb4caff3e0b3517cdf518" ON "workflow_commands" ("documentId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "workflow_definitions" ("code" text PRIMARY KEY NOT NULL, "documentType" text NOT NULL, "name" text NOT NULL, "steps" text NOT NULL, "version" integer NOT NULL DEFAULT (1), "active" boolean NOT NULL DEFAULT (1), CONSTRAINT "UQ_c73f7cc6a02dfd4cdb0cd131274" UNIQUE ("documentType"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "workflow_opinions" ("id" text PRIMARY KEY NOT NULL, "documentId" text NOT NULL, "taskId" text NOT NULL, "actorId" text NOT NULL, "actorName" text NOT NULL, "action" text NOT NULL, "comment" text NOT NULL DEFAULT (''), "createdAt" datetime NOT NULL DEFAULT (datetime('now')))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9c1edd2e326fa9942bb6ccf672" ON "workflow_opinions" ("documentId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "workflow_tasks" ("id" text PRIMARY KEY NOT NULL, "documentId" text NOT NULL, "stepIndex" integer NOT NULL, "assigneeRole" text NOT NULL, "status" text NOT NULL DEFAULT ('PENDING'), "completedBy" text, "createdAt" datetime NOT NULL DEFAULT (datetime('now')), "updatedAt" datetime NOT NULL DEFAULT (datetime('now')))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5799ac4583ad7c7d3da98eb4e8" ON "workflow_tasks" ("documentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e6d36b9bbdef4d55ffb33f704e" ON "workflow_tasks" ("assigneeRole") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3d78f23935aed3e3eee4ddf515" ON "workflow_tasks" ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "contracts" ("id" text PRIMARY KEY NOT NULL, "number" text NOT NULL, "requestId" text, "signingDepartmentId" text NOT NULL, "signingDate" text NOT NULL, "name" text NOT NULL, "amountCents" integer NOT NULL, "counterpartyFullName" text NOT NULL, "contentReason" text NOT NULL, "needsSeal" boolean NOT NULL DEFAULT (0), "applicantId" text NOT NULL, "attachments" text NOT NULL, CONSTRAINT "UQ_7f9a578e633d6521bcc2d9cc8cb" UNIQUE ("number"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "contract_payments" ("id" text PRIMARY KEY NOT NULL, "number" text NOT NULL, "contractId" text NOT NULL, "applicantId" text NOT NULL, "departmentId" text NOT NULL, "project" text NOT NULL, "contractStartDate" text NOT NULL, "contractEndDate" text NOT NULL, "contractSigningDate" text NOT NULL, "contractAmountCents" integer NOT NULL, "budgetAmountCents" integer NOT NULL, "budgetExecutedCents" integer NOT NULL, "accountingSubject" text NOT NULL, "maintenanceEstimateCents" integer, "counterpartyFullName" text NOT NULL, "plannedPaymentCount" integer NOT NULL, "paymentSequence" integer NOT NULL, "executedAmountCents" integer NOT NULL, "remainingAmountCents" integer NOT NULL, "plannedProgress" text NOT NULL, "actualProgress" text NOT NULL, "progressVariance" text NOT NULL, "paymentMethod" text NOT NULL, "paymentReason" text NOT NULL, "invoiceNumber" text, "warrantyStartDate" text, "warrantyEndDate" text, "paymentAmountCents" integer NOT NULL, "paymentAmountUppercase" text NOT NULL, "attachments" text NOT NULL, CONSTRAINT "UQ_2d2edcf04e20b5267a330be87be" UNIQUE ("number"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "contract_requests" ("id" text PRIMARY KEY NOT NULL, "number" text NOT NULL, "title" text NOT NULL, "departmentId" text NOT NULL, "applicantId" text NOT NULL, "requestedAt" text NOT NULL, "amountCents" integer, "content" text NOT NULL, "attachments" text NOT NULL, CONSTRAINT "UQ_302d35c158f4b3416e4fe95e2f6" UNIQUE ("number"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "seal_assets" ("id" text PRIMARY KEY NOT NULL, "code" text NOT NULL, "name" text NOT NULL, "type" text NOT NULL, "custodianUserId" text NOT NULL, "status" text NOT NULL DEFAULT ('AVAILABLE'), "activeBorrowRequestId" text, "validUntil" text, CONSTRAINT "UQ_c52b2740305f06c0039ab364106" UNIQUE ("code"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "seal_borrow_requests" ("id" text PRIMARY KEY NOT NULL, "number" text NOT NULL, "applicantId" text NOT NULL, "departmentId" text NOT NULL, "applicationDate" text NOT NULL, "useDate" text NOT NULL, "plannedReturnDate" text NOT NULL, "companionIds" text NOT NULL, "destination" text NOT NULL, "sealAssetIds" text NOT NULL, "content" text NOT NULL, "attachments" text NOT NULL, "executionStatus" text NOT NULL DEFAULT ('NOT_CHECKED_OUT'), "actualRecipient" text, "checkedOutAt" text, "returnedAt" text, "returnCondition" text, "exceptionNote" text, CONSTRAINT "UQ_e46986bda971d11d8a63f04d92f" UNIQUE ("number"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "seal_use_requests" ("id" text PRIMARY KEY NOT NULL, "number" text NOT NULL, "applicantId" text NOT NULL, "departmentId" text NOT NULL, "applicationDate" text NOT NULL, "useDate" text NOT NULL, "purpose" text NOT NULL, "sealAssetIds" text NOT NULL, "content" text NOT NULL, "attachments" text NOT NULL, "executionStatus" text NOT NULL DEFAULT ('NOT_EXECUTED'), "stampedCopies" integer, "executedAt" text, "archiveNumber" text, "executionNote" text, CONSTRAINT "UQ_6940608bc990150d5fd148df944" UNIQUE ("number"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "material_items" ("id" text PRIMARY KEY NOT NULL, "code" text NOT NULL, "name" text NOT NULL, "specification" text NOT NULL, "unit" text NOT NULL, "availableQuantity" text NOT NULL, "active" boolean NOT NULL DEFAULT (1), CONSTRAINT "UQ_0fd8d1348894cf78add1c0572d8" UNIQUE ("code"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "material_purchase_requests" ("id" text PRIMARY KEY NOT NULL, "number" text NOT NULL, "applicantId" text NOT NULL, "departmentId" text NOT NULL, "applicationDate" text NOT NULL, "items" text NOT NULL, "taxableUnitPriceTotalCents" integer NOT NULL, "taxableAmountTotalCents" integer NOT NULL, CONSTRAINT "UQ_e6d40bbd4a92dbaa492bd827365" UNIQUE ("number"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "material_requisitions" ("id" text PRIMARY KEY NOT NULL, "number" text NOT NULL, "applicantId" text NOT NULL, "departmentId" text NOT NULL, "contactUserId" text NOT NULL, "applicationDate" text NOT NULL, "items" text NOT NULL, "attachments" text NOT NULL, "issueStatus" text NOT NULL DEFAULT ('NOT_ISSUED'), "issuedAt" text, "issuedBy" text, CONSTRAINT "UQ_c9574fefdeb395a45ec40006891" UNIQUE ("number"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "material_requisitions"`);
    await queryRunner.query(`DROP TABLE "material_purchase_requests"`);
    await queryRunner.query(`DROP TABLE "material_items"`);
    await queryRunner.query(`DROP TABLE "seal_use_requests"`);
    await queryRunner.query(`DROP TABLE "seal_borrow_requests"`);
    await queryRunner.query(`DROP TABLE "seal_assets"`);
    await queryRunner.query(`DROP TABLE "contract_requests"`);
    await queryRunner.query(`DROP TABLE "contract_payments"`);
    await queryRunner.query(`DROP TABLE "contracts"`);
    await queryRunner.query(`DROP INDEX "IDX_3d78f23935aed3e3eee4ddf515"`);
    await queryRunner.query(`DROP INDEX "IDX_e6d36b9bbdef4d55ffb33f704e"`);
    await queryRunner.query(`DROP INDEX "IDX_5799ac4583ad7c7d3da98eb4e8"`);
    await queryRunner.query(`DROP TABLE "workflow_tasks"`);
    await queryRunner.query(`DROP INDEX "IDX_9c1edd2e326fa9942bb6ccf672"`);
    await queryRunner.query(`DROP TABLE "workflow_opinions"`);
    await queryRunner.query(`DROP TABLE "workflow_definitions"`);
    await queryRunner.query(`DROP INDEX "IDX_c42f4bb4caff3e0b3517cdf518"`);
    await queryRunner.query(`DROP TABLE "workflow_commands"`);
    await queryRunner.query(`DROP INDEX "IDX_f2f41183ea8fb0c9f6f91a7ecd"`);
    await queryRunner.query(`DROP INDEX "IDX_a5d0c52cc6c08f2886830ea957"`);
    await queryRunner.query(`DROP INDEX "IDX_a7b3c5234ee91b06c766466755"`);
    await queryRunner.query(`DROP INDEX "IDX_5d1e53d99eb920630230c6c651"`);
    await queryRunner.query(`DROP INDEX "IDX_6f3d3b05d2c5da678433247ecd"`);
    await queryRunner.query(`DROP TABLE "document_indexes"`);
    await queryRunner.query(`DROP INDEX "IDX_fe0bb3f6520ee0469504521e71"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "departments"`);
  }
}
