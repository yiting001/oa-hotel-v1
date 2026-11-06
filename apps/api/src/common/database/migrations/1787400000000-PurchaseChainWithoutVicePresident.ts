import type { MigrationInterface, QueryRunner } from 'typeorm';
import { republishCatalogChains } from '../hotel-approval-chain-2026';

/** 采购审批去掉分管副总节点：采购经办 -> 财务审核 -> 财务主管副总 -> 总经理。 */
export class PurchaseChainWithoutVicePresident1787400000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await republishCatalogChains(
      queryRunner,
      'sqlite',
      ['PURCHASE_APPROVAL'],
      '采购审批去掉分管副总节点',
    );
  }

  async down(): Promise<void> {
    // 流程版本保留，便于历史单据重放。
  }
}
