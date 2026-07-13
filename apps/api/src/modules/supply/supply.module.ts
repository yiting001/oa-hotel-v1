import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkflowModule } from '../../common/workflow/workflow.module';
import { SupplyApplicationService } from './application/supply-application.service';
import { SUPPLY_REPOSITORY } from './domain/supply.repository';
import { MaterialItemEntity } from './infrastructure/material-item.entity';
import { MaterialPurchaseEntity } from './infrastructure/material-purchase.entity';
import { MaterialRequisitionEntity } from './infrastructure/material-requisition.entity';
import { TypeOrmSupplyRepository } from './infrastructure/typeorm-supply.repository';
import { SupplyController } from './presentation/supply.controller';

@Module({
  imports: [
    WorkflowModule,
    TypeOrmModule.forFeature([
      MaterialItemEntity,
      MaterialPurchaseEntity,
      MaterialRequisitionEntity,
    ]),
  ],
  controllers: [SupplyController],
  providers: [
    SupplyApplicationService,
    {
      provide: SUPPLY_REPOSITORY,
      useClass: TypeOrmSupplyRepository,
    },
  ],
})
export class SupplyModule {}
