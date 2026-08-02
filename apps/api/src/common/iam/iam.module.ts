import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartmentEntity } from '../auth/department.entity';
import { UserEntity } from '../auth/user.entity';
import { IamAccessService } from './application/iam-access.service';
import { IamOrganizationService } from './application/iam-organization.service';
import { IamService } from './application/iam.service';
import { IamRoleService } from './application/iam-role.service';
import { IamResourceAuthorizationService } from './application/iam-resource-authorization.service';
import { IamSessionProfileService } from './application/iam-session-profile.service';
import { LegacyIamBootstrapService } from './application/legacy-iam-bootstrap.service';
import { iamEntities } from './infrastructure/entities';
import { IamController } from './presentation/iam.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, DepartmentEntity, ...iamEntities])],
  controllers: [IamController],
  providers: [
    IamService,
    IamOrganizationService,
    IamAccessService,
    IamRoleService,
    IamSessionProfileService,
    IamResourceAuthorizationService,
    LegacyIamBootstrapService,
  ],
  exports: [IamService],
})
export class IamModule {}
