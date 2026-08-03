import { MigrationInterface, QueryRunner } from 'typeorm';

export class PostgresInitialSchema1785800000000 implements MigrationInterface {
  name = 'PostgresInitialSchema1785800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "departments" ("id" text NOT NULL, "code" text NOT NULL, "name" text NOT NULL, "managerUserId" text, CONSTRAINT "UQ_91fddbe23e927e1e525c152baa3" UNIQUE ("code"), CONSTRAINT "PK_839517a681a86bb84cbcc6a1e9d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" text NOT NULL, "username" text NOT NULL, "displayName" text NOT NULL, "passwordHash" text NOT NULL, "departmentId" text NOT NULL, "roleCodes" text NOT NULL, "active" boolean NOT NULL DEFAULT true, "passwordChangeRequired" boolean NOT NULL DEFAULT false, "passwordChangedAt" TIMESTAMP, "credentialVersion" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_fe0bb3f6520ee0469504521e71" ON "users" ("username") `,
    );
    await queryRunner.query(
      `CREATE TABLE "login_attempt_states" ("username" text NOT NULL, "generation" text NOT NULL, "attempts" integer NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP NOT NULL, CONSTRAINT "CHK_login_attempt_attempts_positive" CHECK ("attempts" > 0), CONSTRAINT "PK_e3581656cd56c9b4ae34ab40973" PRIMARY KEY ("username"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_login_attempt_expires_at" ON "login_attempt_states" ("expiresAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "document_indexes" ("id" text NOT NULL, "documentType" text NOT NULL, "module" text NOT NULL, "title" text NOT NULL, "applicantId" text NOT NULL, "departmentId" text NOT NULL, "status" text NOT NULL DEFAULT 'DRAFT', "documentNo" text, "revision" integer NOT NULL DEFAULT '1', "currentStep" integer, "workflowCode" text NOT NULL, "processVersionId" text, "formVersionId" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_3a2a125738e64389b7cabbc9a6b" PRIMARY KEY ("id"))`,
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
      `CREATE TABLE "workflow_commands" ("requestId" text NOT NULL, "documentId" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2f0d7a67debfb10d6623e5ba87b" PRIMARY KEY ("requestId", "documentId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c42f4bb4caff3e0b3517cdf518" ON "workflow_commands" ("documentId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "workflow_definitions" ("code" text NOT NULL, "documentType" text NOT NULL, "name" text NOT NULL, "steps" text NOT NULL, "version" integer NOT NULL DEFAULT '1', "active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_c73f7cc6a02dfd4cdb0cd131274" UNIQUE ("documentType"), CONSTRAINT "PK_f07d368644893d4a1a801e152e2" PRIMARY KEY ("code"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "workflow_opinions" ("id" text NOT NULL, "documentId" text NOT NULL, "taskId" text NOT NULL, "actorId" text NOT NULL, "actorName" text NOT NULL, "actorDepartmentId" text, "actorDepartmentName" text, "actorPositionId" text, "actorPositionName" text, "processNodeId" text, "processNodeName" text, "action" text NOT NULL, "comment" text NOT NULL DEFAULT '', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_962520a5fb25ecda682554c9bb8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9c1edd2e326fa9942bb6ccf672" ON "workflow_opinions" ("documentId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "workflow_tasks" ("id" text NOT NULL, "documentId" text NOT NULL, "stepIndex" integer NOT NULL, "processNodeId" text, "assigneeType" text NOT NULL DEFAULT 'ROLE', "assigneeValue" text, "assigneeRole" text NOT NULL, "status" text NOT NULL DEFAULT 'PENDING', "completedBy" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_702a80959e8b659ab50fb64938a" PRIMARY KEY ("id"))`,
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
      `CREATE TABLE "workflow_task_candidates" ("id" text NOT NULL, "taskId" text NOT NULL, "userId" text NOT NULL, "source" text NOT NULL, "roleCode" text, "departmentId" text, CONSTRAINT "PK_30a5270f71cb4f2ff3873505701" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_388f1a56c67c56aebc5d35caf9" ON "workflow_task_candidates" ("taskId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_92ed48b3d0cb67e96aa9348157" ON "workflow_task_candidates" ("userId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_6a8d8bc85dfc7ccd43bf5be560" ON "workflow_task_candidates" ("taskId", "userId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "workflow_batch_commands" ("requestId" text NOT NULL, "actorId" text NOT NULL, "payloadHash" text NOT NULL, "resultJson" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_83c2cfa56faa16cf0b68334d7fa" PRIMARY KEY ("requestId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_656037d590de88627fcc697efc" ON "workflow_batch_commands" ("actorId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "workflow_copies" ("id" text NOT NULL, "documentId" text NOT NULL, "senderId" text NOT NULL, "senderName" text NOT NULL, "recipientId" text NOT NULL, "recipientName" text NOT NULL, "readAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_workflow_copy_recipient" UNIQUE ("documentId", "recipientId"), CONSTRAINT "PK_1a349b7d81cf6cab2a12b84dbc9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ab01eb917d72574e66f3e5dc22" ON "workflow_copies" ("documentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_workflow_copy_recipient_read" ON "workflow_copies" ("recipientId", "readAt", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "document_number_sequences" ("prefix" text NOT NULL, "dateKey" text NOT NULL, "nextSerial" integer NOT NULL DEFAULT '1', CONSTRAINT "PK_919cc6429cedb9f2fa26d2758f1" PRIMARY KEY ("prefix", "dateKey"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "document_follows" ("documentId" text NOT NULL, "userId" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_336c6f1933dd0562756657b6585" PRIMARY KEY ("documentId", "userId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_document_follow_user_created" ON "document_follows" ("userId", "createdAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "iam_department_profiles" ("departmentId" text NOT NULL, "parentDepartmentId" text, "sortOrder" integer NOT NULL DEFAULT '0', "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_a8de7b8f39ceee1e2751164003a" PRIMARY KEY ("departmentId"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "iam_memberships" ("id" text NOT NULL, "userId" text NOT NULL, "departmentId" text NOT NULL, "positionId" text, "isPrimary" boolean NOT NULL DEFAULT false, "isDepartmentHead" boolean NOT NULL DEFAULT false, "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_11b2f914c1e347bebae24845f3e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_709bb12fc6763ee8b537a27fb7" ON "iam_memberships" ("userId", "departmentId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "iam_menus" ("id" text NOT NULL, "parentId" text, "name" text NOT NULL, "type" text NOT NULL, "path" text, "permissionCode" text, "icon" text, "orderNum" integer NOT NULL DEFAULT '0', "visible" boolean NOT NULL DEFAULT true, "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_ea14acfb74227304e9bd6377027" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5a1d954406d272e94d5dd86a65" ON "iam_menus" ("parentId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "iam_permissions" ("id" text NOT NULL, "code" text NOT NULL, "name" text NOT NULL, "module" text NOT NULL, "description" text, "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_647c72677d99c172d9ed329f39c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_4a858550d24c676db0a09cf7c2" ON "iam_permissions" ("code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2050fed12cf52460827946e28e" ON "iam_permissions" ("module") `,
    );
    await queryRunner.query(
      `CREATE TABLE "iam_positions" ("id" text NOT NULL, "code" text NOT NULL, "name" text NOT NULL, "departmentId" text, "sortOrder" integer NOT NULL DEFAULT '0', "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_2a2e86ace11dec72090f6eccf03" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_d955bae2dc3052b47f101a0067" ON "iam_positions" ("code") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_03aa7b82505dd3bc080a995e13" ON "iam_positions" ("departmentId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "iam_role_menus" ("roleId" text NOT NULL, "menuId" text NOT NULL, CONSTRAINT "PK_c708e7b4ab033d25c62847ca780" PRIMARY KEY ("roleId", "menuId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1b852247e0822cd752db54cc03" ON "iam_role_menus" ("menuId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "iam_role_permissions" ("roleId" text NOT NULL, "permissionId" text NOT NULL, CONSTRAINT "PK_84ab599331b8d1c05e507112779" PRIMARY KEY ("roleId", "permissionId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7e7560b859b73ea24d97337fc2" ON "iam_role_permissions" ("permissionId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "iam_roles" ("id" text NOT NULL, "code" text NOT NULL, "name" text NOT NULL, "description" text, "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_aa79b0099c20eed09191e9d4159" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_cef55cfd3c885966e9c6822a73" ON "iam_roles" ("code") `,
    );
    await queryRunner.query(
      `CREATE TABLE "iam_user_roles" ("id" text NOT NULL, "userId" text NOT NULL, "roleId" text NOT NULL, "dataScope" text NOT NULL DEFAULT 'SELF', "scopeDepartmentId" text, CONSTRAINT "PK_b28528ba8d47777a60b12a88f1b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_747a2a7f463c3c55c9dba1c6ae" ON "iam_user_roles" ("userId", "roleId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "request_logs" ("id" text NOT NULL, "trace_id" text NOT NULL, "method" text NOT NULL, "path" text NOT NULL, "query" text, "status_code" integer NOT NULL, "duration_ms" integer NOT NULL, "actor_id" text, "actor_name" text, "request_body" text, "response_body" text, "error_message" text, "error_stack" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_1edd3815ae37a9b9511f5a26dca" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6871d86a1d7c05302af4221927" ON "request_logs" ("trace_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1c265d255b18129a02394c7e6f" ON "request_logs" ("path") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_87b7eb47f818e3858c6cbaec9e" ON "request_logs" ("created_at") `,
    );
    await queryRunner.query(
      `CREATE TABLE "form_definitions" ("id" text NOT NULL, "code" text NOT NULL, "name" text NOT NULL, "description" text, "documentType" text, "active" boolean NOT NULL DEFAULT true, "createdBy" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_13b130292b65615d949a9788c79" UNIQUE ("code"), CONSTRAINT "UQ_38788dc395a71da63a85520b5be" UNIQUE ("documentType"), CONSTRAINT "PK_e7b46c89a49ab24f30618b410d9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "form_versions" ("id" text NOT NULL, "definitionId" text NOT NULL, "version" integer NOT NULL, "status" text NOT NULL, "schemaJson" text NOT NULL, "printSchemaJson" text NOT NULL, "changeNote" text, "createdBy" text NOT NULL, "updatedBy" text NOT NULL, "publishedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_46dbd35ef6adf11a8684deae1b1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b2db7b4836a1fc0a4ca9723675" ON "form_versions" ("definitionId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8d325f1f4493fc09eafc534cc3" ON "form_versions" ("status") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_44e3143de4066a50dabb377b38" ON "form_versions" ("definitionId", "version") `,
    );
    await queryRunner.query(
      `CREATE TABLE "process_definitions" ("id" text NOT NULL, "code" text NOT NULL, "name" text NOT NULL, "description" text, "documentType" text, "active" boolean NOT NULL DEFAULT true, "createdBy" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_a9588be0f6e101970b197149004" UNIQUE ("code"), CONSTRAINT "UQ_35555134ecdbe52ca10dc0c2b60" UNIQUE ("documentType"), CONSTRAINT "PK_068dfeb73af76e704e113f61ba1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "process_versions" ("id" text NOT NULL, "definitionId" text NOT NULL, "version" integer NOT NULL, "status" text NOT NULL, "designJson" text NOT NULL, "changeNote" text, "createdBy" text NOT NULL, "updatedBy" text NOT NULL, "publishedAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_946bd456a45f6dfd629525107fb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4e1dea6cc125a8c05b75ba5629" ON "process_versions" ("definitionId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_22fb519b83d61a61023dc49534" ON "process_versions" ("status") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_68099510c6c2377410fcbabb86" ON "process_versions" ("definitionId", "version") `,
    );
    await queryRunner.query(
      `CREATE TABLE "contracts" ("id" text NOT NULL, "number" text NOT NULL, "requestId" text, "signingDepartmentId" text NOT NULL, "signingDate" text NOT NULL, "name" text NOT NULL, "amountCents" integer NOT NULL, "counterpartyFullName" text NOT NULL, "counterpartyContact" text, "counterpartyPhone" text, "paymentMethod" text, "validFrom" text, "validTo" text, "contentReason" text NOT NULL, "remark" text, "needsSeal" boolean NOT NULL DEFAULT false, "applicantId" text NOT NULL, "attachments" text NOT NULL, CONSTRAINT "UQ_7f9a578e633d6521bcc2d9cc8cb" UNIQUE ("number"), CONSTRAINT "PK_2c7b8f3a7b1acdd49497d83d0fb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "contract_payments" ("id" text NOT NULL, "number" text NOT NULL, "contractId" text NOT NULL, "applicantId" text NOT NULL, "departmentId" text NOT NULL, "project" text NOT NULL, "contractStartDate" text NOT NULL, "contractEndDate" text NOT NULL, "contractSigningDate" text NOT NULL, "contractAmountCents" integer NOT NULL, "budgetAmountCents" integer NOT NULL, "budgetExecutedCents" integer NOT NULL, "accountingSubject" text NOT NULL, "maintenanceEstimateCents" integer, "counterpartyFullName" text NOT NULL, "plannedPaymentCount" integer NOT NULL, "paymentSequence" integer NOT NULL, "executedAmountCents" integer NOT NULL, "remainingAmountCents" integer NOT NULL, "plannedProgress" text NOT NULL, "actualProgress" text NOT NULL, "progressVariance" text NOT NULL, "paymentMethod" text NOT NULL, "paymentReason" text NOT NULL, "invoiceNumber" text, "warrantyStartDate" text, "warrantyEndDate" text, "paymentAmountCents" integer NOT NULL, "paymentAmountUppercase" text NOT NULL, "attachments" text NOT NULL, CONSTRAINT "UQ_2d2edcf04e20b5267a330be87be" UNIQUE ("number"), CONSTRAINT "PK_d13742331d1239939340bbd9b42" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "contract_requests" ("id" text NOT NULL, "number" text NOT NULL, "title" text NOT NULL, "departmentId" text NOT NULL, "applicantId" text NOT NULL, "requestedAt" text NOT NULL, "amountCents" integer, "content" text NOT NULL, "attachments" text NOT NULL, CONSTRAINT "UQ_302d35c158f4b3416e4fe95e2f6" UNIQUE ("number"), CONSTRAINT "PK_74f2498ebadff8d03b0eee19617" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "seal_assets" ("id" text NOT NULL, "code" text NOT NULL, "name" text NOT NULL, "type" text NOT NULL, "custodianUserId" text NOT NULL, "status" text NOT NULL DEFAULT 'AVAILABLE', "activeBorrowRequestId" text, "validUntil" text, CONSTRAINT "UQ_c52b2740305f06c0039ab364106" UNIQUE ("code"), CONSTRAINT "PK_7a125302cab000b83de6cf75048" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "seal_borrow_requests" ("id" text NOT NULL, "number" text NOT NULL, "applicantId" text NOT NULL, "departmentId" text NOT NULL, "applicationDate" text NOT NULL, "useDate" text NOT NULL, "plannedReturnDate" text NOT NULL, "companionIds" text NOT NULL, "destination" text NOT NULL, "sealAssetIds" text NOT NULL, "content" text NOT NULL, "attachments" text NOT NULL, "executionStatus" text NOT NULL DEFAULT 'NOT_CHECKED_OUT', "actualRecipient" text, "checkedOutAt" text, "returnedAt" text, "returnCondition" text, "exceptionNote" text, CONSTRAINT "UQ_e46986bda971d11d8a63f04d92f" UNIQUE ("number"), CONSTRAINT "PK_56244bdb360bce79600aaa6fb4b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "seal_use_requests" ("id" text NOT NULL, "number" text NOT NULL, "applicantId" text NOT NULL, "departmentId" text NOT NULL, "applicationDate" text NOT NULL, "useDate" text NOT NULL, "purpose" text NOT NULL, "sealAssetIds" text NOT NULL, "content" text NOT NULL, "attachments" text NOT NULL, "executionStatus" text NOT NULL DEFAULT 'NOT_EXECUTED', "stampedCopies" integer, "executedAt" text, "archiveNumber" text, "executionNote" text, CONSTRAINT "UQ_6940608bc990150d5fd148df944" UNIQUE ("number"), CONSTRAINT "PK_c074cd5e90ab2c2f936aabaa688" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "material_items" ("id" text NOT NULL, "code" text NOT NULL, "name" text NOT NULL, "specification" text NOT NULL, "unit" text NOT NULL, "availableQuantity" text NOT NULL, "active" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_0fd8d1348894cf78add1c0572d8" UNIQUE ("code"), CONSTRAINT "PK_d832861fb4165c7fcc1df44a84c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "material_purchase_requests" ("id" text NOT NULL, "number" text NOT NULL, "applicantId" text NOT NULL, "departmentId" text NOT NULL, "applicationDate" text NOT NULL, "items" text NOT NULL, "taxableUnitPriceTotalCents" integer NOT NULL, "taxableAmountTotalCents" integer NOT NULL, CONSTRAINT "UQ_e6d40bbd4a92dbaa492bd827365" UNIQUE ("number"), CONSTRAINT "PK_55bb6464e42e13080f12437049c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "material_requisitions" ("id" text NOT NULL, "number" text NOT NULL, "applicantId" text NOT NULL, "departmentId" text NOT NULL, "contactUserId" text NOT NULL, "applicationDate" text NOT NULL, "items" text NOT NULL, "attachments" text NOT NULL, "issueStatus" text NOT NULL DEFAULT 'NOT_ISSUED', "issuedAt" text, "issuedBy" text, CONSTRAINT "UQ_c9574fefdeb395a45ec40006891" UNIQUE ("number"), CONSTRAINT "PK_58e725770e9fa9e00d2bae35ada" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "portal_calendar_events" ("id" text NOT NULL, "title" text NOT NULL, "startAt" TIMESTAMP NOT NULL, "endAt" TIMESTAMP NOT NULL, "allDay" boolean NOT NULL DEFAULT false, "location" text, "kind" text NOT NULL, "displayOrder" integer NOT NULL DEFAULT '0', "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_1c4a8d47e6b16a2bae79f28949e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dcc4937cb949fdcd41e8728972" ON "portal_calendar_events" ("startAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "portal_contents" ("id" text NOT NULL, "category" text NOT NULL, "title" text NOT NULL, "summary" text NOT NULL, "body" text NOT NULL, "publisherId" text NOT NULL, "publisherName" text NOT NULL, "publisherDepartmentId" text, "publisherDepartmentName" text, "audienceType" text NOT NULL, "audienceIds" text NOT NULL, "pinned" boolean NOT NULL DEFAULT false, "requiresReceipt" boolean NOT NULL DEFAULT false, "coverImageUrl" text, "attachments" text NOT NULL, "status" text NOT NULL DEFAULT 'DRAFT', "currentRevision" integer NOT NULL DEFAULT '1', "publishedAt" TIMESTAMP, "offlineAt" TIMESTAMP, "withdrawnAt" TIMESTAMP, "createdAt" TIMESTAMP NOT NULL, "updatedAt" TIMESTAMP NOT NULL, CONSTRAINT "PK_08ddeab2ec04d4a4d8a0d260887" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_78f04c8191baf3792ad7fc3d81" ON "portal_contents" ("category") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e0f6cc0d93934d323f8493f371" ON "portal_contents" ("audienceType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_db5f8a5222ef55f379206444dc" ON "portal_contents" ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_495dcc9028c108d2355fbd4073" ON "portal_contents" ("publishedAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "portal_content_audits" ("id" text NOT NULL, "contentId" text NOT NULL, "action" text NOT NULL, "actorId" text NOT NULL, "actorName" text NOT NULL, "actorDepartmentName" text, "revision" integer NOT NULL, "occurredAt" TIMESTAMP NOT NULL, "details" text NOT NULL, CONSTRAINT "PK_29a2da6f8e4df24be96772da7b0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e514f7295642beb0b2b8028e04" ON "portal_content_audits" ("contentId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_92ad678f0c65cd0b4ff27d1683" ON "portal_content_audits" ("occurredAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "portal_content_revisions" ("id" text NOT NULL, "contentId" text NOT NULL, "revision" integer NOT NULL, "snapshot" text NOT NULL, "createdAt" TIMESTAMP NOT NULL, CONSTRAINT "UQ_portal_content_revision" UNIQUE ("contentId", "revision"), CONSTRAINT "PK_3da38b672f56fd93b6224bcf995" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1e2722ac020bbac7885416a5f0" ON "portal_content_revisions" ("contentId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "portal_quick_links" ("id" text NOT NULL, "title" text NOT NULL, "url" text NOT NULL, "icon" text NOT NULL, "requiredPermissionCodes" text NOT NULL, "displayOrder" integer NOT NULL DEFAULT '0', "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_707a81e5b6b48fc7620f8438685" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "portal_read_receipts" ("contentId" text NOT NULL, "userId" text NOT NULL, "readAt" TIMESTAMP NOT NULL, CONSTRAINT "PK_72c1bcc36e52f6bb7012ae5eaa6" PRIMARY KEY ("contentId", "userId"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cff41baebbc651f024d0907313" ON "portal_read_receipts" ("userId", "readAt") `,
    );
    await queryRunner.query(
      `CREATE TABLE "portal_widgets" ("ownerId" text NOT NULL, "widgetKey" text NOT NULL, "title" text NOT NULL, "displayOrder" integer NOT NULL DEFAULT '0', "visible" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_052a3cb9b263a986b3a90eb622c" PRIMARY KEY ("ownerId", "widgetKey"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "purchases" ("id" text NOT NULL, "number" text NOT NULL, "name" text NOT NULL, "amountCents" integer NOT NULL, "counterpartyName" text NOT NULL, "counterpartyContact" text, "counterpartyPhone" text, "paymentMethod" text, "expectedDeliveryDate" text, "remark" text, "applicantId" text NOT NULL, "departmentId" text NOT NULL, "attachments" text NOT NULL, CONSTRAINT "UQ_a3744e944a0621e780233ca992e" UNIQUE ("number"), CONSTRAINT "PK_1d55032f37a34c6eceacbbca6b8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "petty_change_logs" ("id" text NOT NULL, "procurementId" text NOT NULL, "actorId" text NOT NULL, "actorName" text NOT NULL, "action" text NOT NULL, "detail" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_8364943d7080700b8ac9aa8b5a6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "petty_materials" ("id" text NOT NULL, "name" text NOT NULL, "brand" text NOT NULL, "unit" text NOT NULL DEFAULT '', "unitPriceCents" integer NOT NULL, "supplierName" text NOT NULL, "supplierContact" text, "supplierPhone" text, "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_21f404f99e861e5111e497d7737" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "petty_procurement_items" ("id" text NOT NULL, "procurementId" text NOT NULL, "materialId" text NOT NULL, "name" text NOT NULL, "brand" text NOT NULL, "unit" text NOT NULL DEFAULT '', "unitPriceCents" integer NOT NULL, "quantity" integer NOT NULL, "subtotalCents" integer NOT NULL, CONSTRAINT "PK_a388344ebccb3e6cff996476bf4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "petty_procurements" ("id" text NOT NULL, "number" text NOT NULL, "title" text NOT NULL, "totalAmountCents" integer NOT NULL, "remark" text, "applicantId" text NOT NULL, "departmentId" text NOT NULL, "attachments" text NOT NULL, CONSTRAINT "UQ_a96570866ecef40f26c96d1704c" UNIQUE ("number"), CONSTRAINT "PK_71e48a28dae58d7bbe4564d5892" PRIMARY KEY ("id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "petty_procurements"`);
    await queryRunner.query(`DROP TABLE "petty_procurement_items"`);
    await queryRunner.query(`DROP TABLE "petty_materials"`);
    await queryRunner.query(`DROP TABLE "petty_change_logs"`);
    await queryRunner.query(`DROP TABLE "purchases"`);
    await queryRunner.query(`DROP TABLE "portal_widgets"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cff41baebbc651f024d0907313"`);
    await queryRunner.query(`DROP TABLE "portal_read_receipts"`);
    await queryRunner.query(`DROP TABLE "portal_quick_links"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1e2722ac020bbac7885416a5f0"`);
    await queryRunner.query(`DROP TABLE "portal_content_revisions"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_92ad678f0c65cd0b4ff27d1683"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e514f7295642beb0b2b8028e04"`);
    await queryRunner.query(`DROP TABLE "portal_content_audits"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_495dcc9028c108d2355fbd4073"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_db5f8a5222ef55f379206444dc"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e0f6cc0d93934d323f8493f371"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_78f04c8191baf3792ad7fc3d81"`);
    await queryRunner.query(`DROP TABLE "portal_contents"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_dcc4937cb949fdcd41e8728972"`);
    await queryRunner.query(`DROP TABLE "portal_calendar_events"`);
    await queryRunner.query(`DROP TABLE "material_requisitions"`);
    await queryRunner.query(`DROP TABLE "material_purchase_requests"`);
    await queryRunner.query(`DROP TABLE "material_items"`);
    await queryRunner.query(`DROP TABLE "seal_use_requests"`);
    await queryRunner.query(`DROP TABLE "seal_borrow_requests"`);
    await queryRunner.query(`DROP TABLE "seal_assets"`);
    await queryRunner.query(`DROP TABLE "contract_requests"`);
    await queryRunner.query(`DROP TABLE "contract_payments"`);
    await queryRunner.query(`DROP TABLE "contracts"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_68099510c6c2377410fcbabb86"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_22fb519b83d61a61023dc49534"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4e1dea6cc125a8c05b75ba5629"`);
    await queryRunner.query(`DROP TABLE "process_versions"`);
    await queryRunner.query(`DROP TABLE "process_definitions"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_44e3143de4066a50dabb377b38"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_8d325f1f4493fc09eafc534cc3"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_b2db7b4836a1fc0a4ca9723675"`);
    await queryRunner.query(`DROP TABLE "form_versions"`);
    await queryRunner.query(`DROP TABLE "form_definitions"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_87b7eb47f818e3858c6cbaec9e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1c265d255b18129a02394c7e6f"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6871d86a1d7c05302af4221927"`);
    await queryRunner.query(`DROP TABLE "request_logs"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_747a2a7f463c3c55c9dba1c6ae"`);
    await queryRunner.query(`DROP TABLE "iam_user_roles"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_cef55cfd3c885966e9c6822a73"`);
    await queryRunner.query(`DROP TABLE "iam_roles"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_7e7560b859b73ea24d97337fc2"`);
    await queryRunner.query(`DROP TABLE "iam_role_permissions"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_1b852247e0822cd752db54cc03"`);
    await queryRunner.query(`DROP TABLE "iam_role_menus"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_03aa7b82505dd3bc080a995e13"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_d955bae2dc3052b47f101a0067"`);
    await queryRunner.query(`DROP TABLE "iam_positions"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_2050fed12cf52460827946e28e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_4a858550d24c676db0a09cf7c2"`);
    await queryRunner.query(`DROP TABLE "iam_permissions"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5a1d954406d272e94d5dd86a65"`);
    await queryRunner.query(`DROP TABLE "iam_menus"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_709bb12fc6763ee8b537a27fb7"`);
    await queryRunner.query(`DROP TABLE "iam_memberships"`);
    await queryRunner.query(`DROP TABLE "iam_department_profiles"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_document_follow_user_created"`);
    await queryRunner.query(`DROP TABLE "document_follows"`);
    await queryRunner.query(`DROP TABLE "document_number_sequences"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_workflow_copy_recipient_read"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_ab01eb917d72574e66f3e5dc22"`);
    await queryRunner.query(`DROP TABLE "workflow_copies"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_656037d590de88627fcc697efc"`);
    await queryRunner.query(`DROP TABLE "workflow_batch_commands"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6a8d8bc85dfc7ccd43bf5be560"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_92ed48b3d0cb67e96aa9348157"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_388f1a56c67c56aebc5d35caf9"`);
    await queryRunner.query(`DROP TABLE "workflow_task_candidates"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_3d78f23935aed3e3eee4ddf515"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_e6d36b9bbdef4d55ffb33f704e"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5799ac4583ad7c7d3da98eb4e8"`);
    await queryRunner.query(`DROP TABLE "workflow_tasks"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_9c1edd2e326fa9942bb6ccf672"`);
    await queryRunner.query(`DROP TABLE "workflow_opinions"`);
    await queryRunner.query(`DROP TABLE "workflow_definitions"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_c42f4bb4caff3e0b3517cdf518"`);
    await queryRunner.query(`DROP TABLE "workflow_commands"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_f2f41183ea8fb0c9f6f91a7ecd"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a5d0c52cc6c08f2886830ea957"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_a7b3c5234ee91b06c766466755"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_5d1e53d99eb920630230c6c651"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_6f3d3b05d2c5da678433247ecd"`);
    await queryRunner.query(`DROP TABLE "document_indexes"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_login_attempt_expires_at"`);
    await queryRunner.query(`DROP TABLE "login_attempt_states"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_fe0bb3f6520ee0469504521e71"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "departments"`);
  }
}
