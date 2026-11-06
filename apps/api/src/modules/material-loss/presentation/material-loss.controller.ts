import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { BUSINESS_MODULE_PERMISSIONS, type SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../../common/auth/required-permissions.decorator';
import { MaterialLossService } from '../application/material-loss.service';
import { MaterialLossDto } from './material-loss.dto';

const permission = BUSINESS_MODULE_PERMISSIONS.MATERIAL_LOSS;

@Controller('material-losses')
export class MaterialLossController {
  constructor(@Inject(MaterialLossService) private readonly service: MaterialLossService) {}

  @Post()
  @RequirePermissions('DOCUMENT_CREATE', permission.CREATE)
  create(@Body() dto: MaterialLossDto, @CurrentUser() user: SessionUser) {
    return this.service.save(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('DOCUMENT_CREATE', permission.CREATE)
  update(@Param('id') id: string, @Body() dto: MaterialLossDto, @CurrentUser() user: SessionUser) {
    return this.service.save(dto, user, id);
  }

  @Get(':id')
  @RequirePermissions('DOCUMENT_VIEW', permission.VIEW)
  get(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.get(id, user);
  }
}
