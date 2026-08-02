import { Controller, Get, Inject, Param } from '@nestjs/common';
import { RequirePermissions } from '../../../common/auth/required-permissions.decorator';
import { PortalContentCommandService } from '../application/portal-content-command.service';

@Controller('portal/admin/contents')
export class PortalAdminContentDetailController {
  constructor(
    @Inject(PortalContentCommandService) private readonly service: PortalContentCommandService,
  ) {}

  @Get(':id')
  @RequirePermissions('CONTENT_MANAGE')
  get(@Param('id') id: string) {
    return this.service.get(id);
  }
}
