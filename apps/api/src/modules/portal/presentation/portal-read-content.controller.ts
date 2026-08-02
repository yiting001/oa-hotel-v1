import { Controller, Inject, Param, Post } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../../common/auth/required-permissions.decorator';
import { PortalQueryService } from '../application/portal-query.service';

@Controller('portal/contents')
export class PortalReadContentController {
  constructor(@Inject(PortalQueryService) private readonly service: PortalQueryService) {}

  @Post(':id/read')
  @RequirePermissions('CONTENT_VIEW')
  markRead(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.markRead(id, user);
  }
}
