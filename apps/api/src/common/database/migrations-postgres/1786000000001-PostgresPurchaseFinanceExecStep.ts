import type { MigrationInterface, QueryRunner } from 'typeorm';
import {
  applyHotelApprovalChainAdjustment,
  ensureFinanceExecRole,
} from '../hotel-approval-chain-2026';

/** 采购审批在财务部经理之后增加"财务主管副总"节点。 */
export class PostgresPurchaseFinanceExecStep1786000000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await ensureFinanceExecRole(queryRunner, 'postgres');
    await applyHotelApprovalChainAdjustment(queryRunner, 'postgres');
  }

  async down(): Promise<void> {
    // Data adjustment: previous published versions are retained as RETIRED.
  }
}
