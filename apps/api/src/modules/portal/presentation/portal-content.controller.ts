import { Controller, Get, Inject, Param } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../../common/auth/required-permissions.decorator';
import { PortalQueryService } from '../application/portal-query.service';

@Controller('portal/contents')
export class PortalContentController {
  constructor(@Inject(PortalQueryService) private readonly service: PortalQueryService) {}

  @Get(':id')
  @RequirePermissions('CONTENT_VIEW')
  getContent(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.getContent(id, user);
  }
}
