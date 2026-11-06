import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { BUSINESS_MODULE_PERMISSIONS, type SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../../common/auth/required-permissions.decorator';
import { OrderCirculationService } from '../application/order-circulation.service';
import { OrderCirculationDto } from './order-circulation.dto';

const permission = BUSINESS_MODULE_PERMISSIONS.ORDER_CIRCULATION;

@Controller('order-circulations')
export class OrderCirculationController {
  constructor(
    @Inject(OrderCirculationService) private readonly service: OrderCirculationService,
  ) {}

  @Get('cc-recipients')
  @RequirePermissions('DOCUMENT_VIEW', permission.VIEW)
  ccRecipients(@CurrentUser() user: SessionUser) {
    return this.service.eligibleCcRecipients(user);
  }

  @Post()
  @RequirePermissions('DOCUMENT_CREATE', permission.CREATE)
  create(@Body() dto: OrderCirculationDto, @CurrentUser() user: SessionUser) {
    return this.service.save(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('DOCUMENT_CREATE', permission.CREATE)
  update(
    @Param('id') id: string,
    @Body() dto: OrderCirculationDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.save(dto, user, id);
  }

  @Get(':id')
  @RequirePermissions('DOCUMENT_VIEW', permission.VIEW)
  get(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.get(id, user);
  }
}
