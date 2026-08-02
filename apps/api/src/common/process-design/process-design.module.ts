import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessDesignService } from './application/process-design.service';
import { PROCESS_DESIGN_REPOSITORY } from './domain/process-design.repository';
import { ProcessDefinitionEntity } from './infrastructure/process-definition.entity';
import { ProcessVersionEntity } from './infrastructure/process-version.entity';
import { TypeOrmProcessDesignRepository } from './infrastructure/typeorm-process-design.repository';
import { ProcessDesignController } from './presentation/process-design.controller';
import { ProcessDesignSeeder } from './seed/process-design.seeder';

@Module({
  imports: [TypeOrmModule.forFeature([ProcessDefinitionEntity, ProcessVersionEntity])],
  controllers: [ProcessDesignController],
  providers: [
    ProcessDesignService,
    ProcessDesignSeeder,
    { provide: PROCESS_DESIGN_REPOSITORY, useClass: TypeOrmProcessDesignRepository },
  ],
  exports: [ProcessDesignService],
})
export class ProcessDesignModule {}
