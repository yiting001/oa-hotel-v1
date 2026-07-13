import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { DomainError } from '../../../common/errors/domain-error';
import type { SealRepository } from '../domain/seal.repository';
import { SealAssetEntity } from './seal-asset.entity';
import { SealBorrowEntity } from './seal-borrow.entity';
import { SealUseEntity } from './seal-use.entity';

@Injectable()
export class TypeOrmSealRepository implements SealRepository {
  constructor(
    @InjectRepository(SealAssetEntity)
    private readonly assets: Repository<SealAssetEntity>,
    @InjectRepository(SealBorrowEntity)
    private readonly borrows: Repository<SealBorrowEntity>,
    @InjectRepository(SealUseEntity)
    private readonly uses: Repository<SealUseEntity>,
  ) {}

  countAssets(): Promise<number> {
    return this.assets.count();
  }

  saveAssets(assets: SealAssetEntity[]): Promise<SealAssetEntity[]> {
    return this.assets.save(assets);
  }

  listAssets(): Promise<SealAssetEntity[]> {
    return this.assets.find({ order: { name: 'ASC' } });
  }

  findAssets(ids: string[]): Promise<SealAssetEntity[]> {
    return this.assets.findBy({ id: In(ids) });
  }

  async checkoutAssets(ids: string[], borrowRequestId: string): Promise<void> {
    const assets = await this.findAssets(ids);
    const unavailable = assets.find((asset) => asset.status !== 'AVAILABLE');
    if (unavailable) {
      throw new DomainError('SEAL_ASSET_NOT_AVAILABLE', `${unavailable.name} 当前不可外借`);
    }
    await this.assets.save(
      assets.map((asset) => ({
        ...asset,
        status: 'BORROWED',
        activeBorrowRequestId: borrowRequestId,
      })),
    );
  }

  async returnAssets(ids: string[]): Promise<void> {
    const assets = await this.findAssets(ids);
    await this.assets.save(
      assets.map((asset) => ({
        ...asset,
        status: 'AVAILABLE',
        activeBorrowRequestId: null,
      })),
    );
  }

  saveBorrow(entity: SealBorrowEntity): Promise<SealBorrowEntity> {
    return this.borrows.save(entity);
  }

  findBorrow(id: string): Promise<SealBorrowEntity | null> {
    return this.borrows.findOneBy({ id });
  }

  saveUse(entity: SealUseEntity): Promise<SealUseEntity> {
    return this.uses.save(entity);
  }

  findUse(id: string): Promise<SealUseEntity | null> {
    return this.uses.findOneBy({ id });
  }
}
