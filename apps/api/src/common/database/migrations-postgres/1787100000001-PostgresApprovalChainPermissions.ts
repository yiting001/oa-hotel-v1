import type { MigrationInterface, QueryRunner } from 'typeorm';
import { applyApprovalChainPermissionBaseline } from '../hotel-approval-chain-2026';

/** 修复审批链路角色的模块查看权限：领导/管理员角色缺少 CONTRACT_VIEW 时提交会中断。 */
export class PostgresApprovalChainPermissions1787100000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await applyApprovalChainPermissionBaseline(queryRunner, 'postgres');
  }

  async down(): Promise<void> {
    // 权限基线属于修复性授权，保留不回退。
  }
}
