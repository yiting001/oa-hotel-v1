import { Controller, Get, Inject } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../../common/auth/required-permissions.decorator';
import { PortalQueryService } from '../application/portal-query.service';

@Controller('portal')
export class PortalHomeController {
  constructor(@Inject(PortalQueryService) private readonly service: PortalQueryService) {}

  @Get('home')
  @RequirePermissions('PORTAL_VIEW', 'CONTENT_VIEW')
  getHome(@CurrentUser() user: SessionUser) {
    return this.service.getHome(user);
  }
}
