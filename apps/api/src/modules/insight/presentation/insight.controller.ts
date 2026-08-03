import { Controller, Get, Inject, Query } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../../common/auth/required-permissions.decorator';
import { IAM_PERMISSION } from '../../../common/iam/domain/iam-permission';
import { RequestLogService } from '../../../common/request-log/request-log.service';
import { InsightService } from '../application/insight.service';
import {
  DocumentSearchQuery,
  OperationLogQuery,
  RequestLogQuery,
  StatisticsQuery,
} from './insight.dto';

@Controller('insight')
export class InsightController {
  constructor(
    @Inject(InsightService) private readonly service: InsightService,
    @Inject(RequestLogService) private readonly requestLogs: RequestLogService,
  ) {}

  @Get('documents')
  @RequirePermissions('DOCUMENT_VIEW')
  searchDocuments(@Query() query: DocumentSearchQuery, @CurrentUser() user: SessionUser) {
    return this.service.searchDocuments(query, user);
  }

  @Get('operation-logs')
  @RequirePermissions(IAM_PERMISSION.MANAGE)
  operationLogs(@Query() query: OperationLogQuery) {
    return this.service.listOperationLogs(query);
  }

  @Get('request-logs')
  @RequirePermissions(IAM_PERMISSION.MANAGE)
  requestLogList(@Query() query: RequestLogQuery) {
    return this.requestLogs.search(query);
  }

  @Get('statistics')
  @RequirePermissions(IAM_PERMISSION.MANAGE)
  statistics(@Query() query: StatisticsQuery) {
    return this.service.statistics(query);
  }
}
