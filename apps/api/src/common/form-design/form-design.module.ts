import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FormDesignService } from './application/form-design.service';
import { FORM_DESIGN_REPOSITORY } from './domain/form-design.repository';
import { FormDefinitionEntity } from './infrastructure/form-definition.entity';
import { FormVersionEntity } from './infrastructure/form-version.entity';
import { TypeOrmFormDesignRepository } from './infrastructure/typeorm-form-design.repository';
import { FormDesignController } from './presentation/form-design.controller';
import { FormDesignSeeder } from './seed/form-design.seeder';

@Module({
  imports: [TypeOrmModule.forFeature([FormDefinitionEntity, FormVersionEntity])],
  controllers: [FormDesignController],
  providers: [
    FormDesignService,
    FormDesignSeeder,
    { provide: FORM_DESIGN_REPOSITORY, useClass: TypeOrmFormDesignRepository },
  ],
  exports: [FormDesignService],
})
export class FormDesignModule {}
