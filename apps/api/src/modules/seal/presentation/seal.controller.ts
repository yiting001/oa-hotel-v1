import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { BUSINESS_MODULE_PERMISSIONS, type SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../../common/auth/required-permissions.decorator';
import { SealApplicationService } from '../application/seal-application.service';
import {
  SealBorrowDto,
  SealCheckoutDto,
  SealExecuteDto,
  SealReturnDto,
  SealUseDto,
} from './seal.dto';

const permission = BUSINESS_MODULE_PERMISSIONS.SEAL;

@Controller('seals')
export class SealController {
  constructor(@Inject(SealApplicationService) private readonly service: SealApplicationService) {}

  @Get('assets')
  @RequirePermissions('DOCUMENT_VIEW', permission.VIEW)
  assets() {
    return this.service.listAssets();
  }

  @Post('borrow-requests')
  @RequirePermissions('DOCUMENT_CREATE', permission.CREATE)
  createBorrow(@Body() dto: SealBorrowDto, @CurrentUser() user: SessionUser) {
    return this.service.saveBorrow(dto, user);
  }

  @Patch('borrow-requests/:id')
  @RequirePermissions('DOCUMENT_CREATE', permission.CREATE)
  updateBorrow(
    @Param('id') id: string,
    @Body() dto: SealBorrowDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.saveBorrow(dto, user, id);
  }

  @Get('borrow-requests/:id')
  @RequirePermissions('DOCUMENT_VIEW', permission.VIEW)
  borrow(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.getBorrow(id, user);
  }

  @Post('borrow-requests/:id/checkout')
  @RequirePermissions('DOCUMENT_VIEW', permission.VIEW, 'SEAL_EXECUTE')
  checkout(
    @Param('id') id: string,
    @Body() dto: SealCheckoutDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.checkout(id, dto, user);
  }

  @Post('borrow-requests/:id/return')
  @RequirePermissions('DOCUMENT_VIEW', permission.VIEW, 'SEAL_EXECUTE')
  returnBorrow(
    @Param('id') id: string,
    @Body() dto: SealReturnDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.returnBorrow(id, dto, user);
  }

  @Post('use-requests')
  @RequirePermissions('DOCUMENT_CREATE', permission.CREATE)
  createUse(@Body() dto: SealUseDto, @CurrentUser() user: SessionUser) {
    return this.service.saveUse(dto, user);
  }

  @Patch('use-requests/:id')
  @RequirePermissions('DOCUMENT_CREATE', permission.CREATE)
  updateUse(@Param('id') id: string, @Body() dto: SealUseDto, @CurrentUser() user: SessionUser) {
    return this.service.saveUse(dto, user, id);
  }

  @Get('use-requests/:id')
  @RequirePermissions('DOCUMENT_VIEW', permission.VIEW)
  use(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.getUse(id, user);
  }

  @Post('use-requests/:id/execute')
  @RequirePermissions('DOCUMENT_VIEW', permission.VIEW, 'SEAL_EXECUTE')
  executeUse(
    @Param('id') id: string,
    @Body() dto: SealExecuteDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.executeUse(id, dto, user);
  }
}
