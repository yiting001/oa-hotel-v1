import { Body, Controller, Inject, Param, Patch } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../../common/auth/required-permissions.decorator';
import { PortalContentCommandService } from '../application/portal-content-command.service';
import { PortalContentWriteDto } from './portal-content-admin.dto';

@Controller('portal/admin/contents')
export class PortalAdminContentUpdateController {
  constructor(
    @Inject(PortalContentCommandService) private readonly service: PortalContentCommandService,
  ) {}

  @Patch(':id')
  @RequirePermissions('CONTENT_MANAGE')
  update(
    @Param('id') id: string,
    @Body() dto: PortalContentWriteDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.update(id, dto, user);
  }
}
