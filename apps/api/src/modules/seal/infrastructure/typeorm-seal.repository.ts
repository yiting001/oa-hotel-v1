import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
