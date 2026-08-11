import type { MigrationInterface, QueryRunner } from 'typeorm';
import {
  applyHotelApprovalChainAdjustment,
  ensureFinanceExecRole,
} from '../hotel-approval-chain-2026';

/** 采购审批在财务部经理之后增加"财务主管副总"节点。 */
export class PurchaseFinanceExecStep1786000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await ensureFinanceExecRole(queryRunner, 'sqlite');
    await applyHotelApprovalChainAdjustment(queryRunner, 'sqlite');
  }

  async down(): Promise<void> {
    // Data adjustment: previous published versions are retained as RETIRED.
  }
}
