import { Controller, Get, Inject, Query } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../../common/auth/required-permissions.decorator';
import { PortalQueryService } from '../application/portal-query.service';
import { PortalContentListQueryDto } from './portal-content-list-query.dto';

@Controller('portal/contents')
export class PortalContentListController {
  constructor(@Inject(PortalQueryService) private readonly service: PortalQueryService) {}

  @Get()
  @RequirePermissions('CONTENT_VIEW')
  getContents(@Query() query: PortalContentListQueryDto, @CurrentUser() user: SessionUser) {
    return this.service.getContents(query, user);
  }
}
