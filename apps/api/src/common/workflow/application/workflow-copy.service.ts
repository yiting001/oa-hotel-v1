import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  DirectoryUser,
  SessionUser,
  WorkflowCopyCommandResult,
  WorkflowCopyDelivery,
} from '@oa/contracts';
import { requiredBusinessModulePermissions } from '@oa/contracts';
import { randomUUID } from 'node:crypto';
import { In, Repository } from 'typeorm';
import { UserEntity } from '../../auth/user.entity';
import { IamService } from '../../iam/application/iam.service';
import { WorkflowCopyEntity } from '../infrastructure/workflow-copy.entity';
import { DocumentWorkflowService } from './document-workflow.service';

@Injectable()
export class WorkflowCopyService {
  constructor(
    @InjectRepository(WorkflowCopyEntity)
    private readonly copies: Repository<WorkflowCopyEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @Inject(DocumentWorkflowService)
    private readonly workflow: DocumentWorkflowService,
    @Inject(IamService)
    private readonly iam: IamService,
  ) {}

  async listEligibleRecipients(documentId: string, user: SessionUser): Promise<DirectoryUser[]> {
    this.assertCanCopy(user);
    const document = await this.workflow.getViewableDocument(documentId, user);
    const directoryUsers = (await this.iam.listUsers()).flatMap((candidate) => {
      const primaryMembership =
        candidate.memberships.find((membership) => membership.active && membership.isPrimary) ??
        candidate.memberships.find((membership) => membership.active);
      return candidate.active && candidate.id !== user.id && primaryMembership
        ? [
            {
              id: candidate.id,
              username: candidate.username,
              displayName: candidate.displayName,
              departmentId: primaryMembership.departmentId,
              departmentName: primaryMembership.departmentName,
            },
          ]
        : [];
    });
    const allowed = await this.iam.filterCandidateUsersByPermissions(
      directoryUsers.map(({ id, username, displayName }) => ({ id, username, displayName })),
      requiredBusinessModulePermissions(document.module, 'VIEW'),
      document.departmentId,
      document.applicantId,
    );
    const allowedIds = new Set(allowed.map((recipient) => recipient.id));
    return directoryUsers.filter((recipient) => allowedIds.has(recipient.id));
  }

  async copyDocument(
    documentId: string,
    recipientIds: string[],
    user: SessionUser,
  ): Promise<WorkflowCopyCommandResult> {
    this.assertCanCopy(user);
    const document = await this.workflow.getViewableDocument(documentId, user);
    const uniqueRecipientIds = [...new Set(recipientIds)];
    if (uniqueRecipientIds.includes(user.id)) {
      throw new BadRequestException({
        code: 'WORKFLOW_COPY_SELF_INVALID',
        message: '不能将单据抄送给本人',
      });
    }
    const recipients = await this.users.findBy({ id: In(uniqueRecipientIds), active: true });
    if (recipients.length !== uniqueRecipientIds.length) {
      throw new BadRequestException({
        code: 'WORKFLOW_COPY_RECIPIENT_INVALID',
        message: '抄送接收人不存在或已停用',
      });
    }
    const candidates = recipients.map(({ id, username, displayName }) => ({
      id,
      username,
      displayName,
    }));
    const allowed = await this.iam.filterCandidateUsersByPermissions(
      candidates,
      requiredBusinessModulePermissions(document.module, 'VIEW'),
      document.departmentId,
      document.applicantId,
    );
    const allowedIds = new Set(allowed.map((recipient) => recipient.id));
    const deniedIds = uniqueRecipientIds.filter((id) => !allowedIds.has(id));
    if (deniedIds.length > 0) {
      throw new ForbiddenException({
        code: 'WORKFLOW_COPY_RECIPIENT_DENIED',
        message: '部分接收人无权查看该单据',
        details: { recipientIds: deniedIds },
      });
    }

    const existing = await this.copies.findBy({
      documentId,
      recipientId: In(uniqueRecipientIds),
    });
    const existingIds = new Set(existing.map((copy) => copy.recipientId));
    const recipientById = new Map(recipients.map((recipient) => [recipient.id, recipient]));
    const created = await this.copies.save(
      uniqueRecipientIds
        .filter((recipientId) => !existingIds.has(recipientId))
        .map((recipientId) => ({
          id: randomUUID(),
          documentId,
          senderId: user.id,
          senderName: user.displayName,
          recipientId,
          recipientName: recipientById.get(recipientId)!.displayName,
          readAt: null,
        })),
    );
    const byRecipientId = new Map(
      [...existing, ...created].map((delivery) => [delivery.recipientId, delivery]),
    );
    return {
      documentId,
      deliveries: uniqueRecipientIds.map((recipientId) =>
        this.toDelivery(byRecipientId.get(recipientId)!),
      ),
    };
  }

  async markRead(copyId: string, user: SessionUser): Promise<WorkflowCopyDelivery> {
    const copy = await this.copies.findOneBy({ id: copyId, recipientId: user.id });
    if (!copy) throw new NotFoundException('抄送记录不存在');
    await this.workflow.getViewableDocument(copy.documentId, user);
    if (!copy.readAt) {
      copy.readAt = new Date();
      await this.copies.save(copy);
    }
    return this.toDelivery(copy);
  }

  private assertCanCopy(user: SessionUser): void {
    if (user.permissionCodes.includes('WORKFLOW_COPY')) return;
    throw new ForbiddenException('当前账号没有抄送单据权限');
  }

  private toDelivery(copy: WorkflowCopyEntity): WorkflowCopyDelivery {
    return {
      id: copy.id,
      documentId: copy.documentId,
      senderId: copy.senderId,
      senderName: copy.senderName,
      recipientId: copy.recipientId,
      recipientName: copy.recipientName,
      readAt: copy.readAt?.toISOString() ?? null,
      createdAt: copy.createdAt.toISOString(),
    };
  }
}
