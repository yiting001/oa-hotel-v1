import { Controller, Inject, Param, Post } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../../common/auth/required-permissions.decorator';
import { PortalContentCommandService } from '../application/portal-content-command.service';

@Controller('portal/admin/contents')
export class PortalAdminContentWithdrawController {
  constructor(
    @Inject(PortalContentCommandService) private readonly service: PortalContentCommandService,
  ) {}

  @Post(':id/withdraw')
  @RequirePermissions('CONTENT_MANAGE')
  withdraw(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.withdraw(id, user);
  }
}
