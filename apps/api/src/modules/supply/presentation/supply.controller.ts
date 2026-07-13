import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { SupplyApplicationService } from '../application/supply-application.service';
import { IssueRequisitionDto, MaterialPurchaseDto, MaterialRequisitionDto } from './supply.dto';

@Controller('supplies')
export class SupplyController {
  constructor(
    @Inject(SupplyApplicationService) private readonly service: SupplyApplicationService,
  ) {}

  @Get('items')
  items() {
    return this.service.listItems();
  }

  @Post('purchase-requests')
  createPurchase(@Body() dto: MaterialPurchaseDto, @CurrentUser() user: SessionUser) {
    return this.service.savePurchase(dto, user);
  }

  @Patch('purchase-requests/:id')
  updatePurchase(
    @Param('id') id: string,
    @Body() dto: MaterialPurchaseDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.savePurchase(dto, user, id);
  }

  @Get('purchase-requests/:id')
  purchase(@Param('id') id: string) {
    return this.service.getPurchase(id);
  }

  @Post('requisitions')
  createRequisition(@Body() dto: MaterialRequisitionDto, @CurrentUser() user: SessionUser) {
    return this.service.saveRequisition(dto, user);
  }

  @Patch('requisitions/:id')
  updateRequisition(
    @Param('id') id: string,
    @Body() dto: MaterialRequisitionDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.saveRequisition(dto, user, id);
  }

  @Get('requisitions/:id')
  requisition(@Param('id') id: string) {
    return this.service.getRequisition(id);
  }

  @Post('requisitions/:id/issue')
  issue(
    @Param('id') id: string,
    @Body() dto: IssueRequisitionDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.issue(id, dto, user);
  }
}
