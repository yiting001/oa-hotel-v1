import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../auth/current-user.decorator';
import { RequirePermissions } from '../../auth/required-permissions.decorator';
import { FormDesignService } from '../application/form-design.service';
import {
  CopyFormVersionDto,
  CreateFormDefinitionDto,
  UpdateFormVersionDto,
} from './form-design.dto';

@Controller('forms')
export class FormDesignController {
  constructor(private readonly service: FormDesignService) {}

  @Get()
  @RequirePermissions('FORM_DESIGN_VIEW')
  list() {
    return this.service.list();
  }

  @Post()
  @RequirePermissions('FORM_DESIGN_MANAGE')
  create(@Body() dto: CreateFormDefinitionDto, @CurrentUser() user: SessionUser) {
    return this.service.create(dto, user.id);
  }

  @Get(':id')
  @RequirePermissions('FORM_DESIGN_VIEW')
  get(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }

  @Post(':id/versions')
  @RequirePermissions('FORM_DESIGN_MANAGE')
  copyVersion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CopyFormVersionDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.copyVersion(id, dto, user.id);
  }

  @Patch('versions/:versionId')
  @RequirePermissions('FORM_DESIGN_MANAGE')
  updateVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @Body() dto: UpdateFormVersionDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.updateVersion(versionId, dto, user.id);
  }

  @Post('versions/:versionId/publish')
  @RequirePermissions('FORM_DESIGN_MANAGE')
  publishVersion(
    @Param('versionId', ParseUUIDPipe) versionId: string,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.publishVersion(versionId, user.id);
  }
}
