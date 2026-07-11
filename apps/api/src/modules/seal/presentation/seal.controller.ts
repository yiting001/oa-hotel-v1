import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { SealApplicationService } from '../application/seal-application.service';
import {
  SealBorrowDto,
  SealCheckoutDto,
  SealExecuteDto,
  SealReturnDto,
  SealUseDto,
} from './seal.dto';

@Controller('seals')
export class SealController {
  constructor(@Inject(SealApplicationService) private readonly service: SealApplicationService) {}

  @Get('assets')
  assets() {
    return this.service.listAssets();
  }

  @Post('borrow-requests')
  createBorrow(@Body() dto: SealBorrowDto, @CurrentUser() user: SessionUser) {
    return this.service.saveBorrow(dto, user);
  }

  @Patch('borrow-requests/:id')
  updateBorrow(
    @Param('id') id: string,
    @Body() dto: SealBorrowDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.saveBorrow(dto, user, id);
  }

  @Get('borrow-requests/:id')
  borrow(@Param('id') id: string) {
    return this.service.getBorrow(id);
  }

  @Post('borrow-requests/:id/checkout')
  checkout(
    @Param('id') id: string,
    @Body() dto: SealCheckoutDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.checkout(id, dto, user);
  }

  @Post('borrow-requests/:id/return')
  returnBorrow(
    @Param('id') id: string,
    @Body() dto: SealReturnDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.returnBorrow(id, dto, user);
  }

  @Post('use-requests')
  createUse(@Body() dto: SealUseDto, @CurrentUser() user: SessionUser) {
    return this.service.saveUse(dto, user);
  }

  @Patch('use-requests/:id')
  updateUse(@Param('id') id: string, @Body() dto: SealUseDto, @CurrentUser() user: SessionUser) {
    return this.service.saveUse(dto, user, id);
  }

  @Get('use-requests/:id')
  use(@Param('id') id: string) {
    return this.service.getUse(id);
  }

  @Post('use-requests/:id/execute')
  executeUse(
    @Param('id') id: string,
    @Body() dto: SealExecuteDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.executeUse(id, dto, user);
  }
}
