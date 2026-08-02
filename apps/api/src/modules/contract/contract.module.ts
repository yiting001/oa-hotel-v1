import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IamModule } from '../../common/iam/iam.module';
import { WorkflowModule } from '../../common/workflow/workflow.module';
import { ContractApplicationService } from './application/contract-application.service';
import { CONTRACT_REPOSITORY } from './domain/contract.repository';
import { ContractEntity } from './infrastructure/contract.entity';
import { ContractPaymentEntity } from './infrastructure/contract-payment.entity';
import { ContractRequestEntity } from './infrastructure/contract-request.entity';
import { TypeOrmContractRepository } from './infrastructure/typeorm-contract.repository';
import { ContractController } from './presentation/contract.controller';

@Module({
  imports: [
    IamModule,
    WorkflowModule,
    TypeOrmModule.forFeature([ContractRequestEntity, ContractEntity, ContractPaymentEntity]),
  ],
  controllers: [ContractController],
  providers: [
    ContractApplicationService,
    {
      provide: CONTRACT_REPOSITORY,
      useClass: TypeOrmContractRepository,
    },
  ],
})
export class ContractModule {}
