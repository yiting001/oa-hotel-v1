import type { MigrationInterface, QueryRunner } from 'typeorm';

const TABLES = ['seal_borrow_requests', 'seal_use_requests'] as const;

/** 印章证照名称由台账资产选择改为手动填写，历史数据按台账名称回填。 */
export class PostgresSealAssetNamesFreeText1786100000001 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    const assets: Array<{ id: string; name: string }> = await queryRunner.query(
      `SELECT "id", "name" FROM "seal_assets"`,
    );
    const nameById = new Map(assets.map((asset) => [asset.id, asset.name]));
    for (const table of TABLES) {
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD COLUMN "sealAssetNames" text NOT NULL DEFAULT '[]'`,
      );
      const rows: Array<{ id: string; sealAssetIds: string }> = await queryRunner.query(
        `SELECT "id", "sealAssetIds" FROM "${table}"`,
      );
      for (const row of rows) {
        const ids: string[] = JSON.parse(row.sealAssetIds || '[]');
        const names = ids.map((id) => nameById.get(id) ?? id);
        await queryRunner.query(`UPDATE "${table}" SET "sealAssetNames" = $1 WHERE "id" = $2`, [
          JSON.stringify(names),
          row.id,
        ]);
      }
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "sealAssetIds"`);
    }
  }

  async down(): Promise<void> {
    // Free-text names cannot be reliably mapped back to ledger asset ids.
  }
}
