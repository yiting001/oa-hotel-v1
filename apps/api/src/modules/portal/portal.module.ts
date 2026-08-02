import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IamModule } from '../../common/iam/iam.module';
import { PortalAudienceDirectoryService } from './application/portal-audience-directory.service';
import { PortalContentCommandService } from './application/portal-content-command.service';
import { PortalQueryService } from './application/portal-query.service';
import { PORTAL_CONTENT_ADMIN_REPOSITORY } from './domain/portal-content-admin.repository';
import { PORTAL_REPOSITORY } from './domain/portal.repository';
import { portalEntities } from './infrastructure/entities';
import { PortalDevelopmentSeeder } from './infrastructure/portal-development.seeder';
import { TypeOrmPortalRepository } from './infrastructure/typeorm-portal.repository';
import { TypeOrmPortalContentAdminRepository } from './infrastructure/typeorm-portal-content-admin.repository';
import { PortalAdminAudienceDirectoryController } from './presentation/portal-admin-audience-directory.controller';
import { PortalAdminContentAuditController } from './presentation/portal-admin-content-audit.controller';
import { PortalAdminContentCreateController } from './presentation/portal-admin-content-create.controller';
import { PortalAdminContentDetailController } from './presentation/portal-admin-content-detail.controller';
import { PortalAdminContentListController } from './presentation/portal-admin-content-list.controller';
import { PortalAdminContentPublishController } from './presentation/portal-admin-content-publish.controller';
import { PortalAdminContentUpdateController } from './presentation/portal-admin-content-update.controller';
import { PortalAdminContentWithdrawController } from './presentation/portal-admin-content-withdraw.controller';
import { PortalContentController } from './presentation/portal-content.controller';
import { PortalContentListController } from './presentation/portal-content-list.controller';
import { PortalCalendarController } from './presentation/portal-calendar.controller';
import { PortalHomeController } from './presentation/portal-home.controller';
import { PortalReadContentController } from './presentation/portal-read-content.controller';
import { PortalReadingController } from './presentation/portal-reading.controller';

@Module({
  imports: [TypeOrmModule.forFeature(portalEntities), IamModule],
  controllers: [
    PortalAdminContentListController,
    PortalAdminContentDetailController,
    PortalAdminContentCreateController,
    PortalAdminContentUpdateController,
    PortalAdminContentPublishController,
    PortalAdminContentWithdrawController,
    PortalAdminContentAuditController,
    PortalAdminAudienceDirectoryController,
    PortalHomeController,
    PortalCalendarController,
    PortalReadingController,
    PortalContentListController,
    PortalContentController,
    PortalReadContentController,
  ],
  providers: [
    PortalQueryService,
    PortalContentCommandService,
    PortalAudienceDirectoryService,
    PortalDevelopmentSeeder,
    { provide: PORTAL_REPOSITORY, useClass: TypeOrmPortalRepository },
    {
      provide: PORTAL_CONTENT_ADMIN_REPOSITORY,
      useClass: TypeOrmPortalContentAdminRepository,
    },
  ],
  exports: [PortalQueryService],
})
export class PortalModule {}
