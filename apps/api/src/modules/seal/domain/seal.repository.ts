import { SealAssetEntity } from '../infrastructure/seal-asset.entity';
import { SealBorrowEntity } from '../infrastructure/seal-borrow.entity';
import { SealUseEntity } from '../infrastructure/seal-use.entity';

export const SEAL_REPOSITORY = Symbol('SEAL_REPOSITORY');

export interface SealRepository {
  countAssets(): Promise<number>;
  saveAssets(assets: SealAssetEntity[]): Promise<SealAssetEntity[]>;
  listAssets(): Promise<SealAssetEntity[]>;
  saveBorrow(entity: SealBorrowEntity): Promise<SealBorrowEntity>;
  findBorrow(id: string): Promise<SealBorrowEntity | null>;
  saveUse(entity: SealUseEntity): Promise<SealUseEntity>;
  findUse(id: string): Promise<SealUseEntity | null>;
}
