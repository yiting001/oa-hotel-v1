import { Controller, Get, Inject, Query } from '@nestjs/common';
import { RequirePermissions } from '../../../common/auth/required-permissions.decorator';
import { PortalQueryService } from '../application/portal-query.service';
import { PortalCalendarQueryDto } from './portal-calendar-query.dto';

@Controller('portal')
export class PortalCalendarController {
  constructor(@Inject(PortalQueryService) private readonly service: PortalQueryService) {}

  @Get('calendar')
  @RequirePermissions('PORTAL_VIEW', 'CONTENT_VIEW')
  getCalendar(@Query() query: PortalCalendarQueryDto) {
    return this.service.getCalendar(query);
  }
}
