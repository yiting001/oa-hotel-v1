import { Controller, Get, Inject } from '@nestjs/common';
import { RequirePermissions } from '../../../common/auth/required-permissions.decorator';
import { PortalAudienceDirectoryService } from '../application/portal-audience-directory.service';

@Controller('portal/admin')
export class PortalAdminAudienceDirectoryController {
  constructor(
    @Inject(PortalAudienceDirectoryService)
    private readonly service: PortalAudienceDirectoryService,
  ) {}

  @Get('audience-directory')
  @RequirePermissions('CONTENT_MANAGE')
  get() {
    return this.service.get();
  }
}
