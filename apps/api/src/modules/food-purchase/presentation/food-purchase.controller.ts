import { Body, Controller, Get, Inject, Param, Patch, Post, Put } from '@nestjs/common';
import { BUSINESS_MODULE_PERMISSIONS, type SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../../common/auth/required-permissions.decorator';
import { FoodPurchaseService } from '../application/food-purchase.service';
import { FoodPurchaseDto, FoodPurchaseItemsDto } from './food-purchase.dto';

const permission = BUSINESS_MODULE_PERMISSIONS.FOOD_PURCHASE;

@Controller('food-purchases')
export class FoodPurchaseController {
  constructor(@Inject(FoodPurchaseService) private readonly service: FoodPurchaseService) {}

  @Post()
  @RequirePermissions('DOCUMENT_CREATE', permission.CREATE)
  create(@Body() dto: FoodPurchaseDto, @CurrentUser() user: SessionUser) {
    return this.service.save(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('DOCUMENT_CREATE', permission.CREATE)
  update(
    @Param('id') id: string,
    @Body() dto: FoodPurchaseDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.save(dto, user, id);
  }

  @Get(':id')
  @RequirePermissions('DOCUMENT_VIEW', permission.VIEW)
  get(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.get(id, user);
  }

  /** 审批领导删减/修改明细。 */
  @Put(':id/items')
  @RequirePermissions('DOCUMENT_VIEW', permission.VIEW)
  replaceItems(
    @Param('id') id: string,
    @Body() dto: FoodPurchaseItemsDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.replaceItemsAsApprover(id, dto, user);
  }
}
