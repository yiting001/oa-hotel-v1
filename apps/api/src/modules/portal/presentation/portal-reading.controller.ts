import { Controller, Get, Inject, Query } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../../common/auth/required-permissions.decorator';
import { PortalQueryService } from '../application/portal-query.service';
import { PortalReadingQueryDto } from './portal-reading.dto';

@Controller('portal')
export class PortalReadingController {
  constructor(@Inject(PortalQueryService) private readonly service: PortalQueryService) {}

  @Get('reading')
  @RequirePermissions('CONTENT_VIEW')
  getReading(@Query() query: PortalReadingQueryDto, @CurrentUser() user: SessionUser) {
    return this.service.getReading(query, user);
  }
}
