import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AuthModule } from './common/auth/auth.module';
import { createDatabaseOptions } from './common/database/database-options';
import { RequestLogModule } from './common/request-log/request-log.module';
import { WorkflowModule } from './common/workflow/workflow.module';
import { WorkbenchModule } from './common/workbench/workbench.module';
import { FormDesignModule } from './common/form-design/form-design.module';
import { ProcessDesignModule } from './common/process-design/process-design.module';
import { ContractModule } from './modules/contract/contract.module';
import { InsightModule } from './modules/insight/insight.module';
import { PettyModule } from './modules/petty/petty.module';
import { PortalModule } from './modules/portal/portal.module';
import { PurchaseModule } from './modules/purchase/purchase.module';
import { SealModule } from './modules/seal/seal.module';
import { SupplyModule } from './modules/supply/supply.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(createDatabaseOptions()),
    RequestLogModule,
    AuthModule,
    FormDesignModule,
    ProcessDesignModule,
    WorkflowModule,
    WorkbenchModule,
    PortalModule,
    ContractModule,
    InsightModule,
    PurchaseModule,
    PettyModule,
    SealModule,
    SupplyModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
