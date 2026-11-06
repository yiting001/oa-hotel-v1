import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IamModule } from '../../common/iam/iam.module';
import { WorkflowModule } from '../../common/workflow/workflow.module';
import { OrderCirculationService } from './application/order-circulation.service';
import { OrderCirculationEntity } from './infrastructure/order-circulation.entity';
import { OrderCirculationController } from './presentation/order-circulation.controller';

@Module({
  imports: [IamModule, WorkflowModule, TypeOrmModule.forFeature([OrderCirculationEntity])],
  controllers: [OrderCirculationController],
  providers: [OrderCirculationService],
})
export class OrderCirculationModule {}
