import type { MigrationInterface, QueryRunner } from 'typeorm';
import { applyBusinessExpansion } from '../hotel-business-expansion-2026';

/** 新增食材采购、物资报损、订单流转，并调整请示批复审批链。 */
export class BusinessExpansion1787200000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await applyBusinessExpansion(queryRunner, 'sqlite');
  }

  async down(): Promise<void> {
    // 新模块表与菜单保留，避免删除历史单据数据。
  }
}
