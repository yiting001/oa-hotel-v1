import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AuthModule } from './common/auth/auth.module';
import { createDatabaseOptions } from './common/database/database-options';
import { WorkflowModule } from './common/workflow/workflow.module';
import { ContractModule } from './modules/contract/contract.module';
import { SealModule } from './modules/seal/seal.module';
import { SupplyModule } from './modules/supply/supply.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(createDatabaseOptions()),
    AuthModule,
    WorkflowModule,
    ContractModule,
    SealModule,
    SupplyModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
