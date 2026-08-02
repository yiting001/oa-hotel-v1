import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { BUSINESS_MODULE_PERMISSIONS, type SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../../common/auth/required-permissions.decorator';
import { SupplyApplicationService } from '../application/supply-application.service';
import { IssueRequisitionDto, MaterialPurchaseDto, MaterialRequisitionDto } from './supply.dto';

const permission = BUSINESS_MODULE_PERMISSIONS.SUPPLY;

@Controller('supplies')
export class SupplyController {
  constructor(
    @Inject(SupplyApplicationService) private readonly service: SupplyApplicationService,
  ) {}

  @Get('items')
  @RequirePermissions('DOCUMENT_VIEW', permission.VIEW)
  items() {
    return this.service.listItems();
  }

  @Post('purchase-requests')
  @RequirePermissions('DOCUMENT_CREATE', permission.CREATE)
  createPurchase(@Body() dto: MaterialPurchaseDto, @CurrentUser() user: SessionUser) {
    return this.service.savePurchase(dto, user);
  }

  @Patch('purchase-requests/:id')
  @RequirePermissions('DOCUMENT_CREATE', permission.CREATE)
  updatePurchase(
    @Param('id') id: string,
    @Body() dto: MaterialPurchaseDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.savePurchase(dto, user, id);
  }

  @Get('purchase-requests/:id')
  @RequirePermissions('DOCUMENT_VIEW', permission.VIEW)
  purchase(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.getPurchase(id, user);
  }

  @Post('requisitions')
  @RequirePermissions('DOCUMENT_CREATE', permission.CREATE)
  createRequisition(@Body() dto: MaterialRequisitionDto, @CurrentUser() user: SessionUser) {
    return this.service.saveRequisition(dto, user);
  }

  @Patch('requisitions/:id')
  @RequirePermissions('DOCUMENT_CREATE', permission.CREATE)
  updateRequisition(
    @Param('id') id: string,
    @Body() dto: MaterialRequisitionDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.saveRequisition(dto, user, id);
  }

  @Get('requisitions/:id')
  @RequirePermissions('DOCUMENT_VIEW', permission.VIEW)
  requisition(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.getRequisition(id, user);
  }

  @Post('requisitions/:id/issue')
  @RequirePermissions('DOCUMENT_VIEW', permission.VIEW, 'SUPPLY_ISSUE')
  issue(
    @Param('id') id: string,
    @Body() dto: IssueRequisitionDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.issue(id, dto, user);
  }
}
