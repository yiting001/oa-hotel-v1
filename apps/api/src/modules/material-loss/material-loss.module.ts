import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IamModule } from '../../common/iam/iam.module';
import { WorkflowModule } from '../../common/workflow/workflow.module';
import { MaterialLossService } from './application/material-loss.service';
import { MaterialLossItemEntity } from './infrastructure/material-loss-item.entity';
import { MaterialLossEntity } from './infrastructure/material-loss.entity';
import { MaterialLossController } from './presentation/material-loss.controller';

@Module({
  imports: [
    IamModule,
    WorkflowModule,
    TypeOrmModule.forFeature([MaterialLossEntity, MaterialLossItemEntity]),
  ],
  controllers: [MaterialLossController],
  providers: [MaterialLossService],
})
export class MaterialLossModule {}
