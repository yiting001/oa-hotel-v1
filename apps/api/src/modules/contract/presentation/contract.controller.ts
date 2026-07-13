import { Body, Controller, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { ContractApplicationService } from '../application/contract-application.service';
import { ContractApprovalDto, ContractPaymentDto, ContractRequestDto } from './contract.dto';

@Controller('contracts')
export class ContractController {
  constructor(
    @Inject(ContractApplicationService) private readonly service: ContractApplicationService,
  ) {}

  @Post('requests')
  createRequest(@Body() dto: ContractRequestDto, @CurrentUser() user: SessionUser) {
    return this.service.saveRequest(dto, user);
  }

  @Patch('requests/:id')
  updateRequest(
    @Param('id') id: string,
    @Body() dto: ContractRequestDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.saveRequest(dto, user, id);
  }

  @Get('requests/:id')
  request(@Param('id') id: string) {
    return this.service.getRequest(id);
  }

  @Post()
  createContract(@Body() dto: ContractApprovalDto, @CurrentUser() user: SessionUser) {
    return this.service.saveContract(dto, user);
  }

  @Patch(':id')
  updateContract(
    @Param('id') id: string,
    @Body() dto: ContractApprovalDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.saveContract(dto, user, id);
  }

  @Get('approved')
  approvedContracts() {
    return this.service.listContracts();
  }

  @Get(':id')
  contract(@Param('id') id: string) {
    return this.service.getContract(id);
  }

  @Post('payments')
  createPayment(@Body() dto: ContractPaymentDto, @CurrentUser() user: SessionUser) {
    return this.service.savePayment(dto, user);
  }

  @Patch('payments/:id')
  updatePayment(
    @Param('id') id: string,
    @Body() dto: ContractPaymentDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.savePayment(dto, user, id);
  }

  @Get('payments/:id')
  payment(@Param('id') id: string) {
    return this.service.getPayment(id);
  }
}
