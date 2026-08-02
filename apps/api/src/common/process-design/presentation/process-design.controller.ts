import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../auth/current-user.decorator';
import { RequirePermissions } from '../../auth/required-permissions.decorator';
import { ProcessDesignService } from '../application/process-design.service';
import {
  CopyProcessVersionDto,
  CreateProcessDefinitionDto,
  UpdateProcessVersionDto,
} from './process-design.dto';

@Controller('processes')
export class ProcessDesignController {
  constructor(private readonly service: ProcessDesignService) {}

  @Get()
  @RequirePermissions('PROCESS_DESIGN_VIEW')
  list() {
    return this.service.list();
  }

  @Get('published-summaries')
  @RequirePermissions('DOCUMENT_CREATE')
  listPublishedSummaries() {
    return this.service.listPublishedSummaries();
  }

  @Post()
  @RequirePermissions('PROCESS_DESIGN_MANAGE')
  create(@Body() dto: CreateProcessDefinitionDto, @CurrentUser() user: SessionUser) {
    return this.service.create(dto, user.id);
  }

  @Get(':id')
  @RequirePermissions('PROCESS_DESIGN_VIEW')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }

  @Post(':id/versions')
  @RequirePermissions('PROCESS_DESIGN_MANAGE')
  copyVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CopyProcessVersionDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.copyVersion(id, dto, user.id);
  }

  @Patch('versions/:versionId')
  @RequirePermissions('PROCESS_DESIGN_MANAGE')
  updateVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: UpdateProcessVersionDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.updateVersion(versionId, dto, user.id);
  }

  @Post('versions/:versionId/publish')
  @RequirePermissions('PROCESS_DESIGN_MANAGE')
  publishVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.publishVersion(versionId, user.id);
  }
}
