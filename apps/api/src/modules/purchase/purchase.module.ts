import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IamModule } from '../../common/iam/iam.module';
import { WorkflowModule } from '../../common/workflow/workflow.module';
import { PurchaseApplicationService } from './application/purchase-application.service';
import { PurchaseEntity } from './infrastructure/purchase.entity';
import { PurchaseController } from './presentation/purchase.controller';

@Module({
  imports: [IamModule, WorkflowModule, TypeOrmModule.forFeature([PurchaseEntity])],
  controllers: [PurchaseController],
  providers: [PurchaseApplicationService],
})
export class PurchaseModule {}
