import { Body, Controller, Inject, Post } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../../common/auth/required-permissions.decorator';
import { PortalContentCommandService } from '../application/portal-content-command.service';
import { PortalContentWriteDto } from './portal-content-admin.dto';

@Controller('portal/admin/contents')
export class PortalAdminContentCreateController {
  constructor(
    @Inject(PortalContentCommandService) private readonly service: PortalContentCommandService,
  ) {}

  @Post()
  @RequirePermissions('CONTENT_MANAGE')
  create(@Body() dto: PortalContentWriteDto, @CurrentUser() user: SessionUser) {
    return this.service.create(dto, user);
  }
}
