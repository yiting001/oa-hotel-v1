import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { BUSINESS_MODULE_PERMISSIONS, type SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../../common/auth/required-permissions.decorator';
import { ContractApplicationService } from '../application/contract-application.service';
import { ContractApprovalDto, ContractPaymentDto, ContractRequestDto } from './contract.dto';

const permission = BUSINESS_MODULE_PERMISSIONS.CONTRACT;

@Controller('contracts')
export class ContractController {
  constructor(
    @Inject(ContractApplicationService) private readonly service: ContractApplicationService,
  ) {}

  @Post('requests')
  @RequirePermissions('DOCUMENT_CREATE', permission.CREATE)
  createRequest(@Body() dto: ContractRequestDto, @CurrentUser() user: SessionUser) {
    return this.service.saveRequest(dto, user);
  }

  @Patch('requests/:id')
  @RequirePermissions('DOCUMENT_CREATE', permission.CREATE)
  updateRequest(
    @Param('id') id: string,
    @Body() dto: ContractRequestDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.saveRequest(dto, user, id);
  }

  @Get('requests/:id')
  @RequirePermissions('DOCUMENT_VIEW', permission.VIEW)
  request(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.getRequest(id, user);
  }

  @Post()
  @RequirePermissions('DOCUMENT_CREATE', permission.CREATE)
  createContract(@Body() dto: ContractApprovalDto, @CurrentUser() user: SessionUser) {
    return this.service.saveContract(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('DOCUMENT_CREATE', permission.CREATE)
  updateContract(
    @Param('id') id: string,
    @Body() dto: ContractApprovalDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.saveContract(dto, user, id);
  }

  @Get('approved')
  @RequirePermissions('DOCUMENT_VIEW', permission.VIEW)
  approvedContracts(@CurrentUser() user: SessionUser) {
    return this.service.listContracts(user);
  }

  @Get(':id')
  @RequirePermissions('DOCUMENT_VIEW', permission.VIEW)
  contract(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.getContract(id, user);
  }

  @Post('payments')
  @RequirePermissions('DOCUMENT_CREATE', permission.CREATE)
  createPayment(@Body() dto: ContractPaymentDto, @CurrentUser() user: SessionUser) {
    return this.service.savePayment(dto, user);
  }

  @Patch('payments/:id')
  @RequirePermissions('DOCUMENT_CREATE', permission.CREATE)
  updatePayment(
    @Param('id') id: string,
    @Body() dto: ContractPaymentDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.savePayment(dto, user, id);
  }

  @Get('payments/:id')
  @RequirePermissions('DOCUMENT_VIEW', permission.VIEW)
  payment(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.getPayment(id, user);
  }
}
