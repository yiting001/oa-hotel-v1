import { MigrationInterface, QueryRunner } from 'typeorm';

/** 从 SQLite 迁移链的最终种子状态生成：IAM 权限/角色/菜单授权 + 默认工作流定义。 */
export class PostgresInitialSeed1785800000001 implements MigrationInterface {
  name = 'PostgresInitialSeed1785800000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-iam-view\', \'IAM_VIEW\', \'查看组织权限\', \'IAM\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-iam-manage\', \'IAM_MANAGE\', \'管理组织权限\', \'IAM\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-form-design-view\', \'FORM_DESIGN_VIEW\', \'查看表单设计\', \'FORM_DESIGN\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-form-design-manage\', \'FORM_DESIGN_MANAGE\', \'管理表单设计\', \'FORM_DESIGN\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-process-design-view\', \'PROCESS_DESIGN_VIEW\', \'查看流程设计\', \'PROCESS_DESIGN\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-process-design-manage\', \'PROCESS_DESIGN_MANAGE\', \'管理流程设计\', \'PROCESS_DESIGN\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-document-create\', \'DOCUMENT_CREATE\', \'发起单据\', \'DOCUMENT\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-document-view\', \'DOCUMENT_VIEW\', \'查看单据\', \'DOCUMENT\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-workflow-approve\', \'WORKFLOW_APPROVE\', \'办理审批任务\', \'WORKFLOW\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-contract-manage\', \'CONTRACT_MANAGE\', \'管理合同业务\', \'CONTRACT\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-finance-review\', \'FINANCE_REVIEW\', \'办理财务审核\', \'FINANCE\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-seal-execute\', \'SEAL_EXECUTE\', \'登记印章执行\', \'SEAL\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-supply-procure\', \'SUPPLY_PROCURE\', \'办理物资采购\', \'SUPPLY\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-supply-issue\', \'SUPPLY_ISSUE\', \'登记物资发放\', \'SUPPLY\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-contract-create\', \'CONTRACT_CREATE\', \'创建合同支出单据\', \'CONTRACT\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-contract-view\', \'CONTRACT_VIEW\', \'查看合同支出单据\', \'CONTRACT\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-seal-create\', \'SEAL_CREATE\', \'创建印章申请单据\', \'SEAL\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-seal-view\', \'SEAL_VIEW\', \'查看印章申请单据\', \'SEAL\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-supply-create\', \'SUPPLY_CREATE\', \'创建物资申请单据\', \'SUPPLY\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-supply-view\', \'SUPPLY_VIEW\', \'查看物资申请单据\', \'SUPPLY\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-portal-view\', \'PORTAL_VIEW\', \'查看公司门户\', \'PORTAL\', \'查看公司门户布局、日历和常用入口\', true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-content-view\', \'CONTENT_VIEW\', \'查看门户内容\', \'CONTENT\', \'查看符合受众范围的公司信息\', true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-content-manage\', \'CONTENT_MANAGE\', \'管理门户内容\', \'CONTENT\', \'创建、编辑、发布、撤回门户内容并查看审计记录\', true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-document-follow\', \'DOCUMENT_FOLLOW\', \'关注业务单据\', \'DOCUMENT\', \'关注当前可见单据并在个人工作台持续跟踪\', true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-workflow-copy\', \'WORKFLOW_COPY\', \'抄送业务单据\', \'WORKFLOW\', \'向具有目标单据查看范围的人员发送工作流抄送\', true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-workflow-batch-approve\', \'WORKFLOW_BATCH_APPROVE\', \'批量同意审批\', \'WORKFLOW\', \'对本人当前可办理的兼容任务执行逐项批量同意\', true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-purchase-create\', \'PURCHASE_CREATE\', \'创建采购审批单据\', \'PURCHASE\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-purchase-view\', \'PURCHASE_VIEW\', \'查看采购审批单据\', \'PURCHASE\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-petty-create\', \'PETTY_CREATE\', \'创建零星采买单据\', \'PETTY\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_permissions" ("id", "code", "name", "module", "description", "active") VALUES (\'permission-petty-view\', \'PETTY_VIEW\', \'查看零星采买单据\', \'PETTY\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_roles" ("id", "code", "name", "description", "active") VALUES (\'role-system-admin\', \'SYSTEM_ADMIN\', \'系统管理员\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_roles" ("id", "code", "name", "description", "active") VALUES (\'role-process-admin\', \'PROCESS_ADMIN\', \'流程管理员\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_roles" ("id", "code", "name", "description", "active") VALUES (\'role-form-admin\', \'FORM_ADMIN\', \'表单管理员\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_roles" ("id", "code", "name", "description", "active") VALUES (\'role-applicant\', \'APPLICANT\', \'申请人\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_roles" ("id", "code", "name", "description", "active") VALUES (\'role-department-manager\', \'DEPARTMENT_MANAGER\', \'部门负责人\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_roles" ("id", "code", "name", "description", "active") VALUES (\'role-finance-reviewer\', \'FINANCE_REVIEWER\', \'财务审核人\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_roles" ("id", "code", "name", "description", "active") VALUES (\'role-office-reviewer\', \'OFFICE_REVIEWER\', \'办公室审核人\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_roles" ("id", "code", "name", "description", "active") VALUES (\'role-seal-manager\', \'SEAL_MANAGER\', \'印章管理员\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_roles" ("id", "code", "name", "description", "active") VALUES (\'role-procurement\', \'PROCUREMENT\', \'采购负责人\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_roles" ("id", "code", "name", "description", "active") VALUES (\'role-warehouse-manager\', \'WAREHOUSE_MANAGER\', \'仓库管理员\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_roles" ("id", "code", "name", "description", "active") VALUES (\'role-initiator\', \'INITIATOR\', \'发起人\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_roles" ("id", "code", "name", "description", "active") VALUES (\'role-admin-approver\', \'ADMIN_APPROVER\', \'行政审批人\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_roles" ("id", "code", "name", "description", "active") VALUES (\'role-business-approver\', \'BUSINESS_APPROVER\', \'商务审批人\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_roles" ("id", "code", "name", "description", "active") VALUES (\'role-catering-approver\', \'CATERING_APPROVER\', \'餐饮审批人\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_roles" ("id", "code", "name", "description", "active") VALUES (\'role-exec-pre-approver\', \'EXEC_PRE_APPROVER\', \'高管预审批\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_roles" ("id", "code", "name", "description", "active") VALUES (\'role-exec-approver\', \'EXEC_APPROVER\', \'高管审批\', NULL, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-iam-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-iam-manage\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-form-design-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-form-design-manage\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-process-design-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-process-design-manage\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-document-create\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-document-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-workflow-approve\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-contract-manage\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-finance-review\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-seal-execute\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-supply-procure\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-supply-issue\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-process-admin\', \'permission-iam-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-process-admin\', \'permission-form-design-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-process-admin\', \'permission-process-design-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-process-admin\', \'permission-process-design-manage\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-form-admin\', \'permission-iam-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-form-admin\', \'permission-form-design-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-form-admin\', \'permission-form-design-manage\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-form-admin\', \'permission-process-design-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-applicant\', \'permission-document-create\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-applicant\', \'permission-document-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-department-manager\', \'permission-document-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-department-manager\', \'permission-workflow-approve\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-finance-reviewer\', \'permission-document-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-finance-reviewer\', \'permission-workflow-approve\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-finance-reviewer\', \'permission-finance-review\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-office-reviewer\', \'permission-document-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-office-reviewer\', \'permission-workflow-approve\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-seal-manager\', \'permission-document-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-seal-manager\', \'permission-workflow-approve\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-seal-manager\', \'permission-seal-execute\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-procurement\', \'permission-document-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-procurement\', \'permission-workflow-approve\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-procurement\', \'permission-supply-procure\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-warehouse-manager\', \'permission-document-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-warehouse-manager\', \'permission-workflow-approve\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-warehouse-manager\', \'permission-supply-issue\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-contract-create\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-contract-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-seal-create\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-seal-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-supply-create\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-supply-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-applicant\', \'permission-contract-create\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-applicant\', \'permission-contract-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-applicant\', \'permission-seal-create\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-applicant\', \'permission-seal-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-applicant\', \'permission-supply-create\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-applicant\', \'permission-supply-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-department-manager\', \'permission-contract-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-department-manager\', \'permission-seal-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-department-manager\', \'permission-supply-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-finance-reviewer\', \'permission-contract-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-finance-reviewer\', \'permission-supply-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-office-reviewer\', \'permission-contract-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-office-reviewer\', \'permission-seal-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-seal-manager\', \'permission-seal-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-procurement\', \'permission-supply-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-warehouse-manager\', \'permission-supply-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-applicant\', \'permission-portal-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-department-manager\', \'permission-portal-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-finance-reviewer\', \'permission-portal-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-form-admin\', \'permission-portal-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-office-reviewer\', \'permission-portal-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-process-admin\', \'permission-portal-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-procurement\', \'permission-portal-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-seal-manager\', \'permission-portal-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-portal-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-warehouse-manager\', \'permission-portal-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-applicant\', \'permission-content-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-department-manager\', \'permission-content-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-finance-reviewer\', \'permission-content-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-form-admin\', \'permission-content-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-office-reviewer\', \'permission-content-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-process-admin\', \'permission-content-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-procurement\', \'permission-content-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-seal-manager\', \'permission-content-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-content-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-warehouse-manager\', \'permission-content-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-content-manage\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-office-reviewer\', \'permission-content-manage\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-document-follow\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-applicant\', \'permission-document-follow\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-department-manager\', \'permission-document-follow\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-finance-reviewer\', \'permission-document-follow\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-office-reviewer\', \'permission-document-follow\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-seal-manager\', \'permission-document-follow\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-procurement\', \'permission-document-follow\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-warehouse-manager\', \'permission-document-follow\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-workflow-copy\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-applicant\', \'permission-workflow-copy\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-department-manager\', \'permission-workflow-copy\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-finance-reviewer\', \'permission-workflow-copy\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-office-reviewer\', \'permission-workflow-copy\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-seal-manager\', \'permission-workflow-copy\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-procurement\', \'permission-workflow-copy\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-warehouse-manager\', \'permission-workflow-copy\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-workflow-batch-approve\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-department-manager\', \'permission-workflow-batch-approve\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-finance-reviewer\', \'permission-workflow-batch-approve\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-office-reviewer\', \'permission-workflow-batch-approve\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-seal-manager\', \'permission-workflow-batch-approve\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-procurement\', \'permission-workflow-batch-approve\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-warehouse-manager\', \'permission-workflow-batch-approve\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-purchase-create\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-purchase-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-petty-create\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-system-admin\', \'permission-petty-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-initiator\', \'permission-document-create\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-initiator\', \'permission-document-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-initiator\', \'permission-contract-create\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-initiator\', \'permission-contract-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-initiator\', \'permission-purchase-create\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-initiator\', \'permission-purchase-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-initiator\', \'permission-petty-create\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-initiator\', \'permission-petty-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-admin-approver\', \'permission-document-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-admin-approver\', \'permission-workflow-approve\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-admin-approver\', \'permission-contract-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-admin-approver\', \'permission-purchase-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-admin-approver\', \'permission-petty-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-business-approver\', \'permission-document-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-business-approver\', \'permission-workflow-approve\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-business-approver\', \'permission-contract-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-business-approver\', \'permission-purchase-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-business-approver\', \'permission-petty-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-catering-approver\', \'permission-document-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-catering-approver\', \'permission-workflow-approve\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-catering-approver\', \'permission-contract-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-catering-approver\', \'permission-purchase-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-catering-approver\', \'permission-petty-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-exec-pre-approver\', \'permission-document-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-exec-pre-approver\', \'permission-workflow-approve\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-exec-pre-approver\', \'permission-contract-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-exec-pre-approver\', \'permission-purchase-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-exec-pre-approver\', \'permission-petty-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-exec-approver\', \'permission-document-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-exec-approver\', \'permission-workflow-approve\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-exec-approver\', \'permission-contract-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-exec-approver\', \'permission-purchase-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_permissions" ("roleId", "permissionId") VALUES (\'role-exec-approver\', \'permission-petty-view\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_menus" ("id", "parentId", "name", "type", "path", "permissionCode", "icon", "orderNum", "visible", "active") VALUES (\'menu-office\', NULL, \'办公台\', \'DIR\', NULL, NULL, \'Monitor\', 1, true, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_menus" ("id", "parentId", "name", "type", "path", "permissionCode", "icon", "orderNum", "visible", "active") VALUES (\'menu-business\', NULL, \'业务中心\', \'DIR\', NULL, NULL, \'Suitcase\', 2, true, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_menus" ("id", "parentId", "name", "type", "path", "permissionCode", "icon", "orderNum", "visible", "active") VALUES (\'menu-insight\', NULL, \'运营分析\', \'DIR\', NULL, NULL, \'TrendCharts\', 3, true, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_menus" ("id", "parentId", "name", "type", "path", "permissionCode", "icon", "orderNum", "visible", "active") VALUES (\'menu-platform\', NULL, \'系统设置\', \'DIR\', NULL, NULL, \'Setting\', 4, true, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_menus" ("id", "parentId", "name", "type", "path", "permissionCode", "icon", "orderNum", "visible", "active") VALUES (\'menu-portal\', \'menu-office\', \'公司门户\', \'MENU\', \'/\', \'PORTAL_VIEW,CONTENT_VIEW\', \'House\', 1, true, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_menus" ("id", "parentId", "name", "type", "path", "permissionCode", "icon", "orderNum", "visible", "active") VALUES (\'menu-workbench\', \'menu-office\', \'个人工作台\', \'MENU\', \'/workbench\', NULL, \'DataBoard\', 2, true, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_menus" ("id", "parentId", "name", "type", "path", "permissionCode", "icon", "orderNum", "visible", "active") VALUES (\'menu-approval\', \'menu-office\', \'审批中心\', \'MENU\', \'/approval\', \'WORKFLOW_APPROVE\', \'Checked\', 3, true, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_menus" ("id", "parentId", "name", "type", "path", "permissionCode", "icon", "orderNum", "visible", "active") VALUES (\'menu-contract\', \'menu-business\', \'合同与支出\', \'MENU\', \'/contract\', \'DOCUMENT_VIEW,CONTRACT_VIEW\', \'Tickets\', 1, true, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_menus" ("id", "parentId", "name", "type", "path", "permissionCode", "icon", "orderNum", "visible", "active") VALUES (\'menu-purchase\', \'menu-business\', \'采购审批\', \'MENU\', \'/purchase\', \'DOCUMENT_VIEW,PURCHASE_VIEW\', \'ShoppingCart\', 2, true, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_menus" ("id", "parentId", "name", "type", "path", "permissionCode", "icon", "orderNum", "visible", "active") VALUES (\'menu-petty\', \'menu-business\', \'零星采买\', \'MENU\', \'/petty\', \'DOCUMENT_VIEW,PETTY_VIEW\', \'ShoppingCart\', 3, true, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_menus" ("id", "parentId", "name", "type", "path", "permissionCode", "icon", "orderNum", "visible", "active") VALUES (\'menu-seal\', \'menu-business\', \'行政印章\', \'MENU\', \'/seal\', \'DOCUMENT_VIEW,SEAL_VIEW\', \'Stamp\', 4, true, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_menus" ("id", "parentId", "name", "type", "path", "permissionCode", "icon", "orderNum", "visible", "active") VALUES (\'menu-supply\', \'menu-business\', \'物资管理\', \'MENU\', \'/supply\', \'DOCUMENT_VIEW,SUPPLY_VIEW\', \'Box\', 5, true, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_menus" ("id", "parentId", "name", "type", "path", "permissionCode", "icon", "orderNum", "visible", "active") VALUES (\'menu-insight-documents\', \'menu-insight\', \'单据检索\', \'MENU\', \'/insight/documents\', \'DOCUMENT_VIEW\', \'Tickets\', 1, true, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_menus" ("id", "parentId", "name", "type", "path", "permissionCode", "icon", "orderNum", "visible", "active") VALUES (\'menu-insight-logs\', \'menu-platform\', \'操作日志\', \'MENU\', \'/insight/logs\', \'IAM_MANAGE\', \'DocumentCopy\', 4, true, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_menus" ("id", "parentId", "name", "type", "path", "permissionCode", "icon", "orderNum", "visible", "active") VALUES (\'menu-insight-statistics\', \'menu-insight\', \'统计看板\', \'MENU\', \'/insight/statistics\', \'IAM_MANAGE\', \'DataBoard\', 2, true, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_menus" ("id", "parentId", "name", "type", "path", "permissionCode", "icon", "orderNum", "visible", "active") VALUES (\'menu-content\', \'menu-business\', \'内容管理\', \'MENU\', \'/portal/content-management\', \'CONTENT_MANAGE\', \'DocumentCopy\', 6, true, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_menus" ("id", "parentId", "name", "type", "path", "permissionCode", "icon", "orderNum", "visible", "active") VALUES (\'menu-iam\', \'menu-platform\', \'组织与权限\', \'MENU\', \'/system/iam\', \'IAM_VIEW\', \'OfficeBuilding\', 1, true, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_menus" ("id", "parentId", "name", "type", "path", "permissionCode", "icon", "orderNum", "visible", "active") VALUES (\'menu-menus\', \'menu-platform\', \'菜单管理\', \'MENU\', \'/system/menus\', \'IAM_MANAGE\', \'Menu\', 2, true, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_menus" ("id", "parentId", "name", "type", "path", "permissionCode", "icon", "orderNum", "visible", "active") VALUES (\'menu-petty-materials\', \'menu-business\', \'零星采买物资库\', \'MENU\', \'/system/petty-materials\', \'IAM_MANAGE\', \'Box\', 7, true, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_menus" ("id", "parentId", "name", "type", "path", "permissionCode", "icon", "orderNum", "visible", "active") VALUES (\'menu-processes\', \'menu-platform\', \'审批流程设计\', \'MENU\', \'/system/processes\', \'PROCESS_DESIGN_VIEW\', \'Share\', 3, true, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_menus" ("id", "parentId", "name", "type", "path", "permissionCode", "icon", "orderNum", "visible", "active") VALUES (\'menu-forms\', \'menu-platform\', \'A4 表单设计\', \'MENU\', \'/system/forms\', \'FORM_DESIGN_VIEW\', \'Grid\', 5, true, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-admin-approver\', \'menu-approval\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-admin-approver\', \'menu-business\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-admin-approver\', \'menu-content\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-admin-approver\', \'menu-contract\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-admin-approver\', \'menu-forms\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-admin-approver\', \'menu-iam\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-admin-approver\', \'menu-insight\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-admin-approver\', \'menu-insight-documents\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-admin-approver\', \'menu-insight-logs\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-admin-approver\', \'menu-insight-statistics\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-admin-approver\', \'menu-menus\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-admin-approver\', \'menu-office\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-admin-approver\', \'menu-petty\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-admin-approver\', \'menu-petty-materials\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-admin-approver\', \'menu-platform\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-admin-approver\', \'menu-portal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-admin-approver\', \'menu-processes\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-admin-approver\', \'menu-purchase\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-admin-approver\', \'menu-seal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-admin-approver\', \'menu-supply\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-admin-approver\', \'menu-workbench\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-applicant\', \'menu-approval\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-applicant\', \'menu-business\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-applicant\', \'menu-content\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-applicant\', \'menu-contract\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-applicant\', \'menu-forms\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-applicant\', \'menu-iam\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-applicant\', \'menu-insight\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-applicant\', \'menu-insight-documents\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-applicant\', \'menu-insight-logs\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-applicant\', \'menu-insight-statistics\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-applicant\', \'menu-menus\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-applicant\', \'menu-office\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-applicant\', \'menu-petty\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-applicant\', \'menu-petty-materials\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-applicant\', \'menu-platform\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-applicant\', \'menu-portal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-applicant\', \'menu-processes\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-applicant\', \'menu-purchase\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-applicant\', \'menu-seal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-applicant\', \'menu-supply\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-applicant\', \'menu-workbench\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-business-approver\', \'menu-approval\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-business-approver\', \'menu-business\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-business-approver\', \'menu-content\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-business-approver\', \'menu-contract\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-business-approver\', \'menu-forms\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-business-approver\', \'menu-iam\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-business-approver\', \'menu-insight\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-business-approver\', \'menu-insight-documents\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-business-approver\', \'menu-insight-logs\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-business-approver\', \'menu-insight-statistics\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-business-approver\', \'menu-menus\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-business-approver\', \'menu-office\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-business-approver\', \'menu-petty\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-business-approver\', \'menu-petty-materials\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-business-approver\', \'menu-platform\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-business-approver\', \'menu-portal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-business-approver\', \'menu-processes\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-business-approver\', \'menu-purchase\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-business-approver\', \'menu-seal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-business-approver\', \'menu-supply\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-business-approver\', \'menu-workbench\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-catering-approver\', \'menu-approval\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-catering-approver\', \'menu-business\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-catering-approver\', \'menu-content\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-catering-approver\', \'menu-contract\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-catering-approver\', \'menu-forms\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-catering-approver\', \'menu-iam\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-catering-approver\', \'menu-insight\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-catering-approver\', \'menu-insight-documents\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-catering-approver\', \'menu-insight-logs\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-catering-approver\', \'menu-insight-statistics\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-catering-approver\', \'menu-menus\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-catering-approver\', \'menu-office\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-catering-approver\', \'menu-petty\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-catering-approver\', \'menu-petty-materials\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-catering-approver\', \'menu-platform\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-catering-approver\', \'menu-portal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-catering-approver\', \'menu-processes\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-catering-approver\', \'menu-purchase\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-catering-approver\', \'menu-seal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-catering-approver\', \'menu-supply\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-catering-approver\', \'menu-workbench\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-department-manager\', \'menu-approval\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-department-manager\', \'menu-business\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-department-manager\', \'menu-content\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-department-manager\', \'menu-contract\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-department-manager\', \'menu-forms\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-department-manager\', \'menu-iam\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-department-manager\', \'menu-insight\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-department-manager\', \'menu-insight-documents\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-department-manager\', \'menu-insight-logs\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-department-manager\', \'menu-insight-statistics\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-department-manager\', \'menu-menus\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-department-manager\', \'menu-office\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-department-manager\', \'menu-petty\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-department-manager\', \'menu-petty-materials\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-department-manager\', \'menu-platform\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-department-manager\', \'menu-portal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-department-manager\', \'menu-processes\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-department-manager\', \'menu-purchase\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-department-manager\', \'menu-seal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-department-manager\', \'menu-supply\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-department-manager\', \'menu-workbench\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-approver\', \'menu-approval\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-approver\', \'menu-business\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-approver\', \'menu-content\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-approver\', \'menu-contract\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-approver\', \'menu-forms\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-approver\', \'menu-iam\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-approver\', \'menu-insight\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-approver\', \'menu-insight-documents\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-approver\', \'menu-insight-logs\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-approver\', \'menu-insight-statistics\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-approver\', \'menu-menus\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-approver\', \'menu-office\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-approver\', \'menu-petty\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-approver\', \'menu-petty-materials\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-approver\', \'menu-platform\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-approver\', \'menu-portal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-approver\', \'menu-processes\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-approver\', \'menu-purchase\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-approver\', \'menu-seal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-approver\', \'menu-supply\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-approver\', \'menu-workbench\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-pre-approver\', \'menu-approval\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-pre-approver\', \'menu-business\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-pre-approver\', \'menu-content\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-pre-approver\', \'menu-contract\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-pre-approver\', \'menu-forms\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-pre-approver\', \'menu-iam\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-pre-approver\', \'menu-insight\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-pre-approver\', \'menu-insight-documents\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-pre-approver\', \'menu-insight-logs\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-pre-approver\', \'menu-insight-statistics\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-pre-approver\', \'menu-menus\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-pre-approver\', \'menu-office\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-pre-approver\', \'menu-petty\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-pre-approver\', \'menu-petty-materials\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-pre-approver\', \'menu-platform\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-pre-approver\', \'menu-portal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-pre-approver\', \'menu-processes\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-pre-approver\', \'menu-purchase\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-pre-approver\', \'menu-seal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-pre-approver\', \'menu-supply\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-exec-pre-approver\', \'menu-workbench\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-finance-reviewer\', \'menu-approval\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-finance-reviewer\', \'menu-business\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-finance-reviewer\', \'menu-content\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-finance-reviewer\', \'menu-contract\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-finance-reviewer\', \'menu-forms\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-finance-reviewer\', \'menu-iam\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-finance-reviewer\', \'menu-insight\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-finance-reviewer\', \'menu-insight-documents\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-finance-reviewer\', \'menu-insight-logs\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-finance-reviewer\', \'menu-insight-statistics\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-finance-reviewer\', \'menu-menus\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-finance-reviewer\', \'menu-office\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-finance-reviewer\', \'menu-petty\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-finance-reviewer\', \'menu-petty-materials\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-finance-reviewer\', \'menu-platform\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-finance-reviewer\', \'menu-portal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-finance-reviewer\', \'menu-processes\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-finance-reviewer\', \'menu-purchase\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-finance-reviewer\', \'menu-seal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-finance-reviewer\', \'menu-supply\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-finance-reviewer\', \'menu-workbench\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-form-admin\', \'menu-approval\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-form-admin\', \'menu-business\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-form-admin\', \'menu-content\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-form-admin\', \'menu-contract\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-form-admin\', \'menu-forms\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-form-admin\', \'menu-iam\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-form-admin\', \'menu-insight\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-form-admin\', \'menu-insight-documents\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-form-admin\', \'menu-insight-logs\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-form-admin\', \'menu-insight-statistics\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-form-admin\', \'menu-menus\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-form-admin\', \'menu-office\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-form-admin\', \'menu-petty\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-form-admin\', \'menu-petty-materials\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-form-admin\', \'menu-platform\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-form-admin\', \'menu-portal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-form-admin\', \'menu-processes\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-form-admin\', \'menu-purchase\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-form-admin\', \'menu-seal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-form-admin\', \'menu-supply\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-form-admin\', \'menu-workbench\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-initiator\', \'menu-approval\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-initiator\', \'menu-business\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-initiator\', \'menu-content\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-initiator\', \'menu-contract\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-initiator\', \'menu-forms\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-initiator\', \'menu-iam\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-initiator\', \'menu-insight\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-initiator\', \'menu-insight-documents\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-initiator\', \'menu-insight-logs\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-initiator\', \'menu-insight-statistics\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-initiator\', \'menu-menus\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-initiator\', \'menu-office\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-initiator\', \'menu-petty\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-initiator\', \'menu-petty-materials\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-initiator\', \'menu-platform\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-initiator\', \'menu-portal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-initiator\', \'menu-processes\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-initiator\', \'menu-purchase\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-initiator\', \'menu-seal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-initiator\', \'menu-supply\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-initiator\', \'menu-workbench\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-office-reviewer\', \'menu-approval\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-office-reviewer\', \'menu-business\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-office-reviewer\', \'menu-content\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-office-reviewer\', \'menu-contract\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-office-reviewer\', \'menu-forms\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-office-reviewer\', \'menu-iam\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-office-reviewer\', \'menu-insight\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-office-reviewer\', \'menu-insight-documents\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-office-reviewer\', \'menu-insight-logs\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-office-reviewer\', \'menu-insight-statistics\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-office-reviewer\', \'menu-menus\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-office-reviewer\', \'menu-office\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-office-reviewer\', \'menu-petty\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-office-reviewer\', \'menu-petty-materials\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-office-reviewer\', \'menu-platform\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-office-reviewer\', \'menu-portal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-office-reviewer\', \'menu-processes\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-office-reviewer\', \'menu-purchase\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-office-reviewer\', \'menu-seal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-office-reviewer\', \'menu-supply\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-office-reviewer\', \'menu-workbench\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-process-admin\', \'menu-approval\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-process-admin\', \'menu-business\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-process-admin\', \'menu-content\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-process-admin\', \'menu-contract\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-process-admin\', \'menu-forms\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-process-admin\', \'menu-iam\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-process-admin\', \'menu-insight\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-process-admin\', \'menu-insight-documents\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-process-admin\', \'menu-insight-logs\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-process-admin\', \'menu-insight-statistics\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-process-admin\', \'menu-menus\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-process-admin\', \'menu-office\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-process-admin\', \'menu-petty\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-process-admin\', \'menu-petty-materials\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-process-admin\', \'menu-platform\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-process-admin\', \'menu-portal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-process-admin\', \'menu-processes\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-process-admin\', \'menu-purchase\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-process-admin\', \'menu-seal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-process-admin\', \'menu-supply\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-process-admin\', \'menu-workbench\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-procurement\', \'menu-approval\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-procurement\', \'menu-business\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-procurement\', \'menu-content\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-procurement\', \'menu-contract\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-procurement\', \'menu-forms\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-procurement\', \'menu-iam\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-procurement\', \'menu-insight\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-procurement\', \'menu-insight-documents\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-procurement\', \'menu-insight-logs\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-procurement\', \'menu-insight-statistics\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-procurement\', \'menu-menus\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-procurement\', \'menu-office\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-procurement\', \'menu-petty\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-procurement\', \'menu-petty-materials\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-procurement\', \'menu-platform\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-procurement\', \'menu-portal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-procurement\', \'menu-processes\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-procurement\', \'menu-purchase\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-procurement\', \'menu-seal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-procurement\', \'menu-supply\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-procurement\', \'menu-workbench\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-seal-manager\', \'menu-approval\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-seal-manager\', \'menu-business\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-seal-manager\', \'menu-content\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-seal-manager\', \'menu-contract\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-seal-manager\', \'menu-forms\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-seal-manager\', \'menu-iam\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-seal-manager\', \'menu-insight\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-seal-manager\', \'menu-insight-documents\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-seal-manager\', \'menu-insight-logs\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-seal-manager\', \'menu-insight-statistics\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-seal-manager\', \'menu-menus\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-seal-manager\', \'menu-office\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-seal-manager\', \'menu-petty\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-seal-manager\', \'menu-petty-materials\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-seal-manager\', \'menu-platform\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-seal-manager\', \'menu-portal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-seal-manager\', \'menu-processes\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-seal-manager\', \'menu-purchase\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-seal-manager\', \'menu-seal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-seal-manager\', \'menu-supply\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-seal-manager\', \'menu-workbench\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-system-admin\', \'menu-approval\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-system-admin\', \'menu-business\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-system-admin\', \'menu-content\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-system-admin\', \'menu-contract\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-system-admin\', \'menu-forms\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-system-admin\', \'menu-iam\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-system-admin\', \'menu-insight\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-system-admin\', \'menu-insight-documents\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-system-admin\', \'menu-insight-logs\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-system-admin\', \'menu-insight-statistics\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-system-admin\', \'menu-menus\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-system-admin\', \'menu-office\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-system-admin\', \'menu-petty\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-system-admin\', \'menu-petty-materials\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-system-admin\', \'menu-platform\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-system-admin\', \'menu-portal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-system-admin\', \'menu-processes\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-system-admin\', \'menu-purchase\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-system-admin\', \'menu-seal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-system-admin\', \'menu-supply\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-system-admin\', \'menu-workbench\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-warehouse-manager\', \'menu-approval\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-warehouse-manager\', \'menu-business\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-warehouse-manager\', \'menu-content\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-warehouse-manager\', \'menu-contract\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-warehouse-manager\', \'menu-forms\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-warehouse-manager\', \'menu-iam\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-warehouse-manager\', \'menu-insight\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-warehouse-manager\', \'menu-insight-documents\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-warehouse-manager\', \'menu-insight-logs\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-warehouse-manager\', \'menu-insight-statistics\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-warehouse-manager\', \'menu-menus\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-warehouse-manager\', \'menu-office\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-warehouse-manager\', \'menu-petty\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-warehouse-manager\', \'menu-petty-materials\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-warehouse-manager\', \'menu-platform\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-warehouse-manager\', \'menu-portal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-warehouse-manager\', \'menu-processes\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-warehouse-manager\', \'menu-purchase\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-warehouse-manager\', \'menu-seal\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-warehouse-manager\', \'menu-supply\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "iam_role_menus" ("roleId", "menuId") VALUES (\'role-warehouse-manager\', \'menu-workbench\') ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "workflow_definitions" ("code", "documentType", "name", "steps", "version", "active") VALUES (\'purchase-approval\', \'PURCHASE_APPROVAL\', \'采购审批\', \'["BUSINESS_APPROVER","EXEC_PRE_APPROVER","EXEC_APPROVER"]\', 1, true) ON CONFLICT DO NOTHING',
    );
    await queryRunner.query(
      'INSERT INTO "workflow_definitions" ("code", "documentType", "name", "steps", "version", "active") VALUES (\'petty-procurement\', \'PETTY_PROCUREMENT\', \'零星采买\', \'["CATERING_APPROVER","EXEC_PRE_APPROVER","EXEC_APPROVER"]\', 1, true) ON CONFLICT DO NOTHING',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DELETE FROM "iam_role_menus"');
    await queryRunner.query('DELETE FROM "iam_menus"');
    await queryRunner.query('DELETE FROM "iam_role_permissions"');
    await queryRunner.query('DELETE FROM "iam_roles"');
    await queryRunner.query('DELETE FROM "iam_permissions"');
    await queryRunner.query('DELETE FROM "workflow_definitions"');
  }
}
