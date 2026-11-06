import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IamModule } from '../../common/iam/iam.module';
import { WorkflowModule } from '../../common/workflow/workflow.module';
import { FoodPurchaseService } from './application/food-purchase.service';
import { FoodPurchaseChangeLogEntity } from './infrastructure/food-purchase-change-log.entity';
import { FoodPurchaseItemEntity } from './infrastructure/food-purchase-item.entity';
import { FoodPurchaseEntity } from './infrastructure/food-purchase.entity';
import { FoodPurchaseController } from './presentation/food-purchase.controller';

@Module({
  imports: [
    IamModule,
    WorkflowModule,
    TypeOrmModule.forFeature([
      FoodPurchaseEntity,
      FoodPurchaseItemEntity,
      FoodPurchaseChangeLogEntity,
    ]),
  ],
  controllers: [FoodPurchaseController],
  providers: [FoodPurchaseService],
})
export class FoodPurchaseModule {}
