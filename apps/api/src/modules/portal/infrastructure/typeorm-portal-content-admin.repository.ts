import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, LessThanOrEqual, Repository } from 'typeorm';
import type {
  PortalContentAdminPageResult,
  PortalContentAdminQuery,
  PortalContentAdminRepository,
  PortalContentMutationRecord,
} from '../domain/portal-content-admin.repository';
import { createPortalContentSnapshot } from '../domain/portal-content-snapshot';
import { PortalContentAuditEntity } from './portal-content-audit.entity';
import { PortalContentRevisionEntity } from './portal-content-revision.entity';
import { PortalContentEntity } from './portal-content.entity';

const SYSTEM_ACTOR = {
  id: 'SYSTEM',
  name: '系统调度',
} as const;

@Injectable()
export class TypeOrmPortalContentAdminRepository implements PortalContentAdminRepository {
  constructor(
    @InjectRepository(PortalContentEntity)
    private readonly contents: Repository<PortalContentEntity>,
    @InjectRepository(PortalContentAuditEntity)
    private readonly audits: Repository<PortalContentAuditEntity>,
    @Inject(DataSource)
    private readonly dataSource: DataSource,
  ) {}

  async list(query: PortalContentAdminQuery): Promise<PortalContentAdminPageResult> {
    const builder = this.contents.createQueryBuilder('content');
    if (query.status) builder.andWhere('content.status = :status', { status: query.status });
    if (query.category) {
      builder.andWhere('content.category = :category', { category: query.category });
    }
    if (query.keyword) {
      builder.andWhere(
        "(content.title LIKE :keyword ESCAPE '\\' OR content.summary LIKE :keyword ESCAPE '\\')",
        { keyword: `%${escapeLike(query.keyword)}%` },
      );
    }
    const [items, total] = await builder
      .orderBy('content.updatedAt', 'DESC')
      .addOrderBy('content.id', 'DESC')
      .offset((query.page - 1) * query.pageSize)
      .limit(query.pageSize)
      .getManyAndCount();
    return { total, items };
  }

  findById(id: string): Promise<PortalContentEntity | null> {
    return this.contents
      .createQueryBuilder('content')
      .addSelect(['content.body', 'content.attachments'])
      .where('content.id = :id', { id })
      .getOne();
  }

  commit(record: PortalContentMutationRecord): Promise<boolean> {
    return this.dataSource.transaction(async (manager) => {
      const contents = manager.getRepository(PortalContentEntity);
      if (record.expectedRevision === null) {
        if (await contents.exist({ where: { id: record.content.id } })) return false;
      } else {
        const current = await contents.findOneBy({
          id: record.content.id,
          currentRevision: record.expectedRevision,
        });
        if (!current) return false;
      }
      await contents.save(record.content);
      await manager.getRepository(PortalContentRevisionEntity).insert(record.revision);
      await manager.getRepository(PortalContentAuditEntity).insert(record.audit as never);
      return true;
    });
  }

  listAudit(contentId: string) {
    return this.audits.find({ where: { contentId }, order: { occurredAt: 'DESC', id: 'DESC' } });
  }

  publishDueScheduled(at: Date): Promise<number> {
    return this.dataSource.transaction(async (manager) => {
      const contents = manager.getRepository(PortalContentEntity);
      const due = await contents.find({
        where: { status: 'SCHEDULED', publishedAt: LessThanOrEqual(at) },
      });
      for (const summary of due) {
        const content = await contents
          .createQueryBuilder('content')
          .addSelect(['content.body', 'content.attachments'])
          .where('content.id = :id', { id: summary.id })
          .andWhere('content.status = :status', { status: 'SCHEDULED' })
          .getOne();
        if (!content) continue;
        content.status = 'PUBLISHED';
        content.currentRevision += 1;
        content.updatedAt = at;
        await contents.save(content);
        await manager.getRepository(PortalContentRevisionEntity).insert({
          id: randomUUID(),
          contentId: content.id,
          revision: content.currentRevision,
          snapshot: createPortalContentSnapshot(content),
          createdAt: at,
        });
        await manager.getRepository(PortalContentAuditEntity).insert({
          id: randomUUID(),
          contentId: content.id,
          action: 'PUBLISHED',
          actorId: SYSTEM_ACTOR.id,
          actorName: SYSTEM_ACTOR.name,
          actorDepartmentName: null,
          revision: content.currentRevision,
          occurredAt: at,
          details: { scheduledAt: content.publishedAt?.toISOString() ?? null },
        } as never);
      }
      return due.length;
    });
  }
}

function escapeLike(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');
}
