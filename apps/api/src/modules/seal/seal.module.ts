import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowModule } from '../../common/workflow/workflow.module';
import { SealApplicationService } from './application/seal-application.service';
import { SEAL_REPOSITORY } from './domain/seal.repository';
import { SealAssetEntity } from './infrastructure/seal-asset.entity';
import { SealBorrowEntity } from './infrastructure/seal-borrow.entity';
import { SealUseEntity } from './infrastructure/seal-use.entity';
import { TypeOrmSealRepository } from './infrastructure/typeorm-seal.repository';
import { SealController } from './presentation/seal.controller';

@Module({
  imports: [
    WorkflowModule,
    TypeOrmModule.forFeature([SealAssetEntity, SealBorrowEntity, SealUseEntity]),
  ],
  controllers: [SealController],
  providers: [
    SealApplicationService,
    {
      provide: SEAL_REPOSITORY,
      useClass: TypeOrmSealRepository,
    },
  ],
})
export class SealModule {}
