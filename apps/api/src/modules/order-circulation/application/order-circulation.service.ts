import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  requiredBusinessModulePermissions,
  type DirectoryUser,
  type SessionUser,
} from '@oa/contracts';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { IamService } from '../../../common/iam/application/iam.service';
import { normalizeAttachments } from '../../../common/storage/attachment-items';
import { businessDateIso } from '../../../common/time/business-date';
import { DocumentNumberService } from '../../../common/workflow/application/document-number.service';
import { DocumentWorkflowService } from '../../../common/workflow/application/document-workflow.service';
import {
  OrderCirculationEntity,
  type OrderCcRecipient,
} from '../infrastructure/order-circulation.entity';
import type { OrderCirculationDto } from '../presentation/order-circulation.dto';

@Injectable()
export class OrderCirculationService {
  constructor(
    @InjectRepository(OrderCirculationEntity)
    private readonly orders: Repository<OrderCirculationEntity>,
    @Inject(DocumentWorkflowService)
    private readonly workflow: DocumentWorkflowService,
    @Inject(DocumentNumberService)
    private readonly documentNumbers: DocumentNumberService,
    @Inject(IamService)
    private readonly iam: IamService,
    @Inject(DataSource)
    private readonly dataSource: DataSource,
  ) {}

  async save(dto: OrderCirculationDto, user: SessionUser, id?: string) {
    const ccRecipients = await this.resolveRecipients(dto.ccUserIds);
    const attachments = normalizeAttachments(dto.attachments);
    if (id) {
      await this.workflow.getEditable(id, user);
      const current = await this.orders.findOneBy({ id });
      if (!current) {
        throw new NotFoundException('订单流转单不存在');
      }
      await this.orders.save({
        ...current,
        applicationDate: dto.applicationDate ?? current.applicationDate,
        subject: dto.subject.trim(),
        content: dto.content.trim(),
        ccRecipients,
        attachments,
      });
      await this.workflow.updateDraftTitle(id, dto.subject.trim(), user);
      return this.get(id, user);
    }

    const documentId = randomUUID();
    // 订单流转单号：部门简称 + 日期 + 序号，例如 GCB20261028-001
    const number = await this.documentNumbers.generateForDepartment(
      this.dataSource.manager,
      user.departmentName,
    );
    await this.orders.save({
      id: documentId,
      number,
      applicantId: user.id,
      departmentId: user.departmentId,
      applicationDate: dto.applicationDate ?? businessDateIso(),
      subject: dto.subject.trim(),
      content: dto.content.trim(),
      ccRecipients,
      attachments,
    });
    await this.workflow.registerDraft({
      id: documentId,
      documentType: 'ORDER_CIRCULATION',
      module: 'ORDER_CIRCULATION',
      title: dto.subject.trim(),
      applicantId: user.id,
      departmentId: user.departmentId,
      documentNo: number,
    });
    return this.get(documentId, user);
  }

  async get(id: string, user: SessionUser) {
    await this.workflow.getViewableDocument(id, user);
    const entity = await this.orders.findOneBy({ id });
    if (!entity) {
      throw new NotFoundException('订单流转单不存在');
    }
    return {
      data: entity,
      document: await this.workflow.getDocument(id),
      opinions: await this.workflow.readOpinions(id),
    };
  }

  /** 发起时可选抄送人：与单据抄送一致，只列出有权查看订单流转的人。 */
  async eligibleCcRecipients(user: SessionUser): Promise<DirectoryUser[]> {
    const users = await this.iam.listUsers();
    const directory = users.flatMap((candidate) => {
      const membership =
        candidate.memberships.find((entry) => entry.active && entry.isPrimary) ??
        candidate.memberships.find((entry) => entry.active);
      return candidate.active && candidate.id !== user.id && membership
        ? [
            {
              id: candidate.id,
              username: candidate.username,
              displayName: candidate.displayName,
              departmentId: membership.departmentId,
              departmentName: membership.departmentName,
            },
          ]
        : [];
    });
    const allowed = await this.iam.filterCandidateUsersByPermissions(
      directory.map(({ id, username, displayName }) => ({ id, username, displayName })),
      requiredBusinessModulePermissions('ORDER_CIRCULATION', 'VIEW'),
      user.departmentId,
      user.id,
    );
    const allowedIds = new Set(allowed.map((recipient) => recipient.id));
    return directory.filter((recipient) => allowedIds.has(recipient.id));
  }

  private async resolveRecipients(userIds: string[]): Promise<OrderCcRecipient[]> {
    const uniqueIds = [...new Set(userIds)];
    if (uniqueIds.length === 0) return [];
    const users = await this.iam.listUsers();
    const byId = new Map(users.filter((candidate) => candidate.active).map((user) => [user.id, user]));
    const missing = uniqueIds.filter((userId) => !byId.has(userId));
    if (missing.length > 0) {
      throw new BadRequestException({
        code: 'ORDER_CC_RECIPIENT_INVALID',
        message: '抄送人不存在或已停用，请重新选择',
        details: { recipientIds: missing },
      });
    }
    return uniqueIds.map((userId) => ({ id: userId, name: byId.get(userId)!.displayName }));
  }
}
