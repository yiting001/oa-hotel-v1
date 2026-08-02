import { Body, Controller, Inject, Param, Post } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../../common/auth/required-permissions.decorator';
import { PortalContentCommandService } from '../application/portal-content-command.service';
import { PortalContentPublishDto } from './portal-content-admin.dto';

@Controller('portal/admin/contents')
export class PortalAdminContentPublishController {
  constructor(
    @Inject(PortalContentCommandService) private readonly service: PortalContentCommandService,
  ) {}

  @Post(':id/publish')
  @RequirePermissions('CONTENT_MANAGE')
  publish(
    @Param('id') id: string,
    @Body() dto: PortalContentPublishDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.publish(id, dto, user);
  }
}
