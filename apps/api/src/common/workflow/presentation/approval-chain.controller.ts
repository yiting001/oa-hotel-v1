import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';
import { CurrentUser } from '../../auth/current-user.decorator';
import { RequirePermissions } from '../../auth/required-permissions.decorator';
import { ApprovalChainService } from '../application/approval-chain.service';

export class UpdateApprovalChainDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  steps!: string[];
}

@Controller('workflow/approval-chains')
export class ApprovalChainController {
  constructor(private readonly service: ApprovalChainService) {}

  @Get()
  @RequirePermissions('PROCESS_DESIGN_VIEW')
  list() {
    return this.service.list();
  }

  @Put(':documentType')
  @RequirePermissions('PROCESS_DESIGN_MANAGE')
  update(
    @Param('documentType') documentType: string,
    @Body() dto: UpdateApprovalChainDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.update(documentType, dto.steps, user.id);
  }
}
