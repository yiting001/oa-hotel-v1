import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { DocumentFollowState, SessionUser } from '@oa/contracts';
import { Repository } from 'typeorm';
import { DocumentWorkflowService } from '../../workflow/application/document-workflow.service';
import { DocumentFollowEntity } from '../infrastructure/document-follow.entity';

@Injectable()
export class DocumentFollowService {
  constructor(
    @InjectRepository(DocumentFollowEntity)
    private readonly follows: Repository<DocumentFollowEntity>,
    @Inject(DocumentWorkflowService)
    private readonly workflow: DocumentWorkflowService,
  ) {}

  async getState(documentId: string, user: SessionUser): Promise<DocumentFollowState> {
    this.assertCanFollow(user);
    await this.workflow.getViewableDocument(documentId, user);
    return this.state(documentId, await this.follows.findOneBy({ documentId, userId: user.id }));
  }

  async follow(documentId: string, user: SessionUser): Promise<DocumentFollowState> {
    this.assertCanFollow(user);
    await this.workflow.getViewableDocument(documentId, user);
    await this.follows.upsert({ documentId, userId: user.id }, ['documentId', 'userId']);
    return this.state(
      documentId,
      await this.follows.findOneByOrFail({ documentId, userId: user.id }),
    );
  }

  async unfollow(documentId: string, user: SessionUser): Promise<DocumentFollowState> {
    this.assertCanFollow(user);
    await this.follows.delete({ documentId, userId: user.id });
    return this.state(documentId, null);
  }

  private assertCanFollow(user: SessionUser): void {
    if (user.permissionCodes.includes('DOCUMENT_FOLLOW')) return;
    throw new ForbiddenException('当前账号没有关注单据权限');
  }

  private state(documentId: string, follow: DocumentFollowEntity | null): DocumentFollowState {
    return {
      documentId,
      following: Boolean(follow),
      followedAt: follow?.createdAt.toISOString() ?? null,
    };
  }
}
