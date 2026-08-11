import type { MigrationInterface, QueryRunner } from 'typeorm';
import { applyHotelApprovalChainAdjustment } from '../hotel-approval-chain-2026';

/** 印章、采购与零星采买审批链路调整：办公室主任/分管副总/总经理与采购、财务经理节点。 */
export class HotelApprovalChainAdjustment1785900000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await applyHotelApprovalChainAdjustment(queryRunner, 'sqlite');
  }

  async down(): Promise<void> {
    // Data adjustment: previous published versions are retained as RETIRED.
  }
}
