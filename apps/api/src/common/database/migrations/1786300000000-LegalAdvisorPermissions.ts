import type { MigrationInterface, QueryRunner } from 'typeorm';
import { applyLegalAdvisorPermissionNarrowing } from '../hotel-approval-chain-2026';

/** 外部律师只需办合同审批与查看单据，收回误继承的主管领导权限（含零星采买发起）。 */
export class LegalAdvisorPermissions1786300000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await applyLegalAdvisorPermissionNarrowing(queryRunner, 'sqlite');
  }

  async down(): Promise<void> {
    // 权限收紧为安全修正，不回滚。
  }
}
