import { Controller, Get, Inject, Param } from '@nestjs/common';
import { RequirePermissions } from '../../../common/auth/required-permissions.decorator';
import { PortalContentCommandService } from '../application/portal-content-command.service';

@Controller('portal/admin/contents')
export class PortalAdminContentAuditController {
  constructor(
    @Inject(PortalContentCommandService) private readonly service: PortalContentCommandService,
  ) {}

  @Get(':id/audit')
  @RequirePermissions('CONTENT_MANAGE')
  audit(@Param('id') id: string) {
    return this.service.audit(id);
  }
}
