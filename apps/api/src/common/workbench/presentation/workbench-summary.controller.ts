import { Controller, Get, Inject } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../auth/current-user.decorator';
import { WorkbenchQueryService } from '../application/workbench-query.service';

@Controller('workbench')
export class WorkbenchSummaryController {
  constructor(@Inject(WorkbenchQueryService) private readonly service: WorkbenchQueryService) {}

  @Get('summary')
  getSummary(@CurrentUser() user: SessionUser) {
    return this.service.getSummary(user);
  }
}
