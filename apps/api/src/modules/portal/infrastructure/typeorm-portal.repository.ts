import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import type { PortalRepository, PortalSeedData } from '../domain/portal.repository';
import type {
  PortalContent,
  PortalEvent,
  PortalLink,
  PortalReadReceipt,
  PortalWidget,
  PortalVisibleContentQuery,
  PortalVisibleContentResult,
} from '../domain/portal.types';
import { PortalCalendarEventEntity } from './portal-calendar-event.entity';
import { PortalContentAuditEntity } from './portal-content-audit.entity';
import { PortalContentEntity } from './portal-content.entity';
import { PortalContentRevisionEntity } from './portal-content-revision.entity';
import { createPortalContentSnapshot } from '../domain/portal-content-snapshot';
import { PortalQuickLinkEntity } from './portal-quick-link.entity';
import { PortalReadReceiptEntity } from './portal-read-receipt.entity';
import { PortalWidgetEntity } from './portal-widget.entity';

@Injectable()
export class TypeOrmPortalRepository implements PortalRepository {
  constructor(
    @InjectRepository(PortalContentEntity)
    private readonly contents: Repository<PortalContentEntity>,
    @InjectRepository(PortalReadReceiptEntity)
    private readonly receipts: Repository<PortalReadReceiptEntity>,
    @InjectRepository(PortalCalendarEventEntity)
    private readonly events: Repository<PortalCalendarEventEntity>,
    @InjectRepository(PortalQuickLinkEntity)
    private readonly links: Repository<PortalQuickLinkEntity>,
    @InjectRepository(PortalWidgetEntity)
    private readonly widgets: Repository<PortalWidgetEntity>,
    @Inject(DataSource)
    private readonly dataSource: DataSource,
  ) {}

  async findVisibleContents(query: PortalVisibleContentQuery): Promise<PortalVisibleContentResult> {
    const builder = this.createVisibleContentQuery(query);
    const count = await builder
      .clone()
      .select('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN receipt.contentId IS NULL THEN 1 ELSE 0 END)', 'unreadCount')
      .getRawOne<{ total: number | string; unreadCount: number | string | null }>();
    const total = Number(count?.total ?? 0);
    if (total === 0) return { total: 0, unreadCount: 0, items: [] };

    const page = builder
      .select('content')
      .addSelect('receipt.readAt', 'receiptReadAt')
      .orderBy('content.pinned', 'DESC')
      .addOrderBy('content.publishedAt', 'DESC')
      .addOrderBy('content.id', 'DESC');
    if (query.offset !== undefined) page.offset(query.offset);
    if (query.limit !== undefined) page.limit(query.limit);
    const { entities, raw } = await page.getRawAndEntities<{
      receiptReadAt: Date | string | null;
    }>();

    return {
      total,
      unreadCount: Number(count?.unreadCount ?? 0),
      items: entities.map((content, index) => {
        const readAt = raw[index]?.receiptReadAt;
        return {
          content,
          receipt: readAt
            ? {
                contentId: content.id,
                userId: query.audience.userId,
                readAt: readAt instanceof Date ? readAt : new Date(readAt),
              }
            : null,
        };
      }),
    };
  }

  findContent(id: string): Promise<PortalContent | null> {
    return this.contents
      .createQueryBuilder('content')
      .addSelect(['content.body', 'content.attachments'])
      .where('content.id = :id', { id })
      .getOne();
  }

  findReceipts(contentIds: string[], userId: string): Promise<PortalReadReceipt[]> {
    if (contentIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.receipts.find({
      where: { contentId: In(contentIds), userId },
      order: { readAt: 'DESC' },
    });
  }

  async saveReadReceipt(
    contentId: string,
    userId: string,
    readAt: Date,
  ): Promise<PortalReadReceipt> {
    await this.receipts
      .createQueryBuilder()
      .insert()
      .values({ contentId, userId, readAt })
      .orIgnore()
      .execute();
    return this.receipts.findOneByOrFail({ contentId, userId });
  }

  listEvents(from: Date, until: Date): Promise<PortalEvent[]> {
    return this.events
      .createQueryBuilder('event')
      .where('event.active = :active', { active: true })
      .andWhere('event.endAt >= :from', { from })
      .andWhere('event.startAt <= :until', { until })
      .orderBy('event.startAt', 'ASC')
      .addOrderBy('event.displayOrder', 'ASC')
      .addOrderBy('event.id', 'ASC')
      .getMany();
  }

  listLinks(): Promise<PortalLink[]> {
    return this.links.find({ where: { active: true }, order: { displayOrder: 'ASC' } });
  }

  listWidgets(userId: string): Promise<PortalWidget[]> {
    return this.widgets.find({
      where: { ownerId: In(['DEFAULT', userId]) },
      order: { displayOrder: 'ASC' },
    });
  }

  async seed(data: PortalSeedData): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager
        .getRepository(PortalContentEntity)
        .createQueryBuilder()
        .insert()
        .values(data.contents)
        .orIgnore()
        .execute();
      await manager
        .getRepository(PortalContentRevisionEntity)
        .createQueryBuilder()
        .insert()
        .values(
          data.contents.map((content) => ({
            id: `seed-revision-${content.id}`,
            contentId: content.id,
            revision: content.currentRevision,
            snapshot: createPortalContentSnapshot(content),
            createdAt: content.updatedAt,
          })) as never,
        )
        .orIgnore()
        .execute();
      await manager
        .getRepository(PortalContentAuditEntity)
        .createQueryBuilder()
        .insert()
        .values(
          data.contents.map((content) => ({
            id: `seed-audit-${content.id}`,
            contentId: content.id,
            action: seedAuditAction(content.status),
            actorId: content.publisherId,
            actorName: content.publisherName,
            actorDepartmentName: content.publisherDepartmentName,
            revision: content.currentRevision,
            occurredAt: content.updatedAt,
            details: { source: 'DEVELOPMENT_SEED' },
          })) as never,
        )
        .orIgnore()
        .execute();
      await manager.getRepository(PortalCalendarEventEntity).upsert(data.events, ['id']);
      await manager.getRepository(PortalQuickLinkEntity).upsert(data.links, ['id']);
      await manager
        .getRepository(PortalWidgetEntity)
        .upsert(data.widgets, ['ownerId', 'widgetKey']);
    });
  }

  private createVisibleContentQuery(query: PortalVisibleContentQuery) {
    const builder = this.contents
      .createQueryBuilder('content')
      .leftJoin(
        PortalReadReceiptEntity,
        'receipt',
        'receipt.contentId = content.id AND receipt.userId = :receiptUserId',
        { receiptUserId: query.audience.userId },
      )
      .where('content.status = :status', { status: 'PUBLISHED' })
      .andWhere('content.publishedAt <= :at', { at: query.at })
      .andWhere('(content.offlineAt IS NULL OR content.offlineAt > :at)', { at: query.at });

    const audienceConditions = [
      "content.audienceType = 'ALL'",
      `(content.audienceType = 'USER' AND EXISTS (
        SELECT 1 FROM json_each(content.audienceIds) target
        WHERE target.value = :audienceUserId
      ))`,
    ];
    const parameters: Record<string, unknown> = { audienceUserId: query.audience.userId };
    if (query.audience.roleCodes.length > 0) {
      audienceConditions.push(`(content.audienceType = 'ROLE' AND EXISTS (
        SELECT 1 FROM json_each(content.audienceIds) target
        WHERE target.value IN (:...audienceRoleCodes)
      ))`);
      parameters.audienceRoleCodes = query.audience.roleCodes;
    }
    if (query.audience.departmentIds.length > 0) {
      audienceConditions.push(`(content.audienceType = 'DEPARTMENT' AND EXISTS (
        SELECT 1 FROM json_each(content.audienceIds) target
        WHERE target.value IN (:...audienceDepartmentIds)
      ))`);
      parameters.audienceDepartmentIds = query.audience.departmentIds;
    }
    builder.andWhere(`(${audienceConditions.join(' OR ')})`, parameters);

    if (query.category) {
      builder.andWhere('content.category = :category', { category: query.category });
    }
    if (query.requiresReceipt !== undefined) {
      builder.andWhere('content.requiresReceipt = :requiresReceipt', {
        requiresReceipt: query.requiresReceipt,
      });
    }
    if (query.readingStatus === 'READ') builder.andWhere('receipt.contentId IS NOT NULL');
    if (query.readingStatus === 'UNREAD') builder.andWhere('receipt.contentId IS NULL');
    return builder;
  }
}

function seedAuditAction(status: PortalContent['status']) {
  if (status === 'SCHEDULED') return 'SCHEDULED' as const;
  if (status === 'PUBLISHED') return 'PUBLISHED' as const;
  if (status === 'WITHDRAWN') return 'WITHDRAWN' as const;
  return 'CREATED' as const;
}
