import { Controller, Get, Inject, Query } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../auth/current-user.decorator';
import { WorkbenchQueryService } from '../application/workbench-query.service';
import { WorkbenchItemsQueryDto } from './workbench-items-query.dto';

@Controller('workbench')
export class WorkbenchItemsController {
  constructor(@Inject(WorkbenchQueryService) private readonly service: WorkbenchQueryService) {}

  @Get('items')
  getItems(@Query() query: WorkbenchItemsQueryDto, @CurrentUser() user: SessionUser) {
    return this.service.getItems(query, user);
  }
}
