import { Controller, Get, Inject, Query } from '@nestjs/common';
import { RequirePermissions } from '../../../common/auth/required-permissions.decorator';
import { PortalContentCommandService } from '../application/portal-content-command.service';
import { PortalContentAdminQueryDto } from './portal-content-admin.dto';

@Controller('portal/admin/contents')
export class PortalAdminContentListController {
  constructor(
    @Inject(PortalContentCommandService) private readonly service: PortalContentCommandService,
  ) {}

  @Get()
  @RequirePermissions('CONTENT_MANAGE')
  list(@Query() query: PortalContentAdminQueryDto) {
    return this.service.list(query);
  }
}
