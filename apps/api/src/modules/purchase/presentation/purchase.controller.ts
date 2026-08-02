import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { BUSINESS_MODULE_PERMISSIONS, type SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../../common/auth/required-permissions.decorator';
import { PurchaseApplicationService } from '../application/purchase-application.service';
import { PurchaseDto } from './purchase.dto';

const permission = BUSINESS_MODULE_PERMISSIONS.PURCHASE;

@Controller('purchases')
export class PurchaseController {
  constructor(
    @Inject(PurchaseApplicationService) private readonly service: PurchaseApplicationService,
  ) {}

  @Post()
  @RequirePermissions('DOCUMENT_CREATE', permission.CREATE)
  create(@Body() dto: PurchaseDto, @CurrentUser() user: SessionUser) {
    return this.service.save(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('DOCUMENT_CREATE', permission.CREATE)
  update(@Param('id') id: string, @Body() dto: PurchaseDto, @CurrentUser() user: SessionUser) {
    return this.service.save(dto, user, id);
  }

  @Get(':id')
  @RequirePermissions('DOCUMENT_VIEW', permission.VIEW)
  get(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.get(id, user);
  }
}
