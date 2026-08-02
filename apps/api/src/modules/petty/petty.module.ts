import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IamModule } from '../../common/iam/iam.module';
import { WorkflowModule } from '../../common/workflow/workflow.module';
import { PettyApplicationService } from './application/petty-application.service';
import { PettyChangeLogEntity } from './infrastructure/petty-change-log.entity';
import { PettyMaterialEntity } from './infrastructure/petty-material.entity';
import { PettyProcurementItemEntity } from './infrastructure/petty-procurement-item.entity';
import { PettyProcurementEntity } from './infrastructure/petty-procurement.entity';
import { PettyController } from './presentation/petty.controller';

@Module({
  imports: [
    IamModule,
    WorkflowModule,
    TypeOrmModule.forFeature([
      PettyMaterialEntity,
      PettyProcurementEntity,
      PettyProcurementItemEntity,
      PettyChangeLogEntity,
    ]),
  ],
  controllers: [PettyController],
  providers: [PettyApplicationService],
})
export class PettyModule {}
