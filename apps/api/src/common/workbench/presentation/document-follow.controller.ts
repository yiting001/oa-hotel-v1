import { Controller, Delete, Get, Inject, Param, Post } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../auth/current-user.decorator';
import { RequirePermissions } from '../../auth/required-permissions.decorator';
import { DocumentFollowService } from '../application/document-follow.service';

@Controller('workbench/documents')
@RequirePermissions('DOCUMENT_FOLLOW')
export class DocumentFollowController {
  constructor(@Inject(DocumentFollowService) private readonly follows: DocumentFollowService) {}

  @Get(':documentId/follow')
  getState(@Param('documentId') documentId: string, @CurrentUser() user: SessionUser) {
    return this.follows.getState(documentId, user);
  }

  @Post(':documentId/follow')
  follow(@Param('documentId') documentId: string, @CurrentUser() user: SessionUser) {
    return this.follows.follow(documentId, user);
  }

  @Delete(':documentId/follow')
  unfollow(@Param('documentId') documentId: string, @CurrentUser() user: SessionUser) {
    return this.follows.unfollow(documentId, user);
  }
}
