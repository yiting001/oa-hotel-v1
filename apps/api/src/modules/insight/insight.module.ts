import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../../common/auth/user.entity';
import { IamModule } from '../../common/iam/iam.module';
import { DocumentIndexEntity } from '../../common/workflow/infrastructure/document-index.entity';
import { WorkflowOpinionEntity } from '../../common/workflow/infrastructure/workflow-opinion.entity';
import { ContractEntity } from '../contract/infrastructure/contract.entity';
import { PettyProcurementEntity } from '../petty/infrastructure/petty-procurement.entity';
import { PurchaseEntity } from '../purchase/infrastructure/purchase.entity';
import { InsightService } from './application/insight.service';
import { InsightController } from './presentation/insight.controller';

@Module({
  imports: [
    IamModule,
    TypeOrmModule.forFeature([
      DocumentIndexEntity,
      WorkflowOpinionEntity,
      UserEntity,
      ContractEntity,
      PurchaseEntity,
      PettyProcurementEntity,
    ]),
  ],
  controllers: [InsightController],
  providers: [InsightService],
})
export class InsightModule {}
