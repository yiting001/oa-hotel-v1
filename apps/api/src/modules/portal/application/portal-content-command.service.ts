import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  PortalAdminContentDetail,
  PortalAdminContentPage,
  PortalContentAuditAction,
  PortalContentAuditTrail,
  SessionUser,
} from '@oa/contracts';
import { randomUUID } from 'node:crypto';
import { DomainError } from '../../../common/errors/domain-error';
import {
  PORTAL_CONTENT_ADMIN_REPOSITORY,
  type PortalContentAdminRepository,
  type PortalContentMutationRecord,
} from '../domain/portal-content-admin.repository';
import { createPortalContentSnapshot } from '../domain/portal-content-snapshot';
import type { PortalContent, PortalContentAudit } from '../domain/portal.types';
import {
  toPortalAdminContentDetail,
  toPortalAdminContentSummary,
  toPortalContentAuditEvent,
} from './portal-content-admin.mapper';
import type {
  PortalContentAdminQueryInput,
  PortalContentPublishInput,
  PortalContentWriteInput,
} from './portal-content-command.input';
import { sanitizePortalContentBody } from './portal-content-html';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;
const editableStatuses = new Set(['DRAFT', 'SCHEDULED', 'PUBLISHED']);

@Injectable()
export class PortalContentCommandService {
  constructor(
    @Inject(PORTAL_CONTENT_ADMIN_REPOSITORY)
    private readonly repository: PortalContentAdminRepository,
  ) {}

  async list(
    input: PortalContentAdminQueryInput,
    at = new Date(),
  ): Promise<PortalAdminContentPage> {
    await this.repository.publishDueScheduled(at);
    const page = positiveInteger(input.page, 1);
    const pageSize = Math.min(positiveInteger(input.pageSize, DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
    const result = await this.repository.list({
      page,
      pageSize,
      status: input.status,
      category: input.category,
      keyword: normalizeQueryText(input.keyword),
    });
    return {
      page,
      pageSize,
      total: result.total,
      items: result.items.map(toPortalAdminContentSummary),
    };
  }

  async get(id: string, at = new Date()): Promise<PortalAdminContentDetail> {
    await this.repository.publishDueScheduled(at);
    return toPortalAdminContentDetail(await this.find(id));
  }

  async create(
    input: PortalContentWriteInput,
    actor: SessionUser,
    at = new Date(),
  ): Promise<PortalAdminContentDetail> {
    const values = requireCreateValues(input);
    const content: PortalContent = {
      id: randomUUID(),
      ...values,
      publisherId: actor.id,
      publisherName: actor.displayName,
      publisherDepartmentId: actor.departmentId || null,
      publisherDepartmentName: actor.departmentName || null,
      status: 'DRAFT',
      currentRevision: 1,
      publishedAt: null,
      withdrawnAt: null,
      createdAt: at,
      updatedAt: at,
    };
    await this.commit(content, null, 'CREATED', actor, at, {});
    return toPortalAdminContentDetail(content);
  }

  async update(
    id: string,
    input: PortalContentWriteInput,
    actor: SessionUser,
    at = new Date(),
  ): Promise<PortalAdminContentDetail> {
    await this.repository.publishDueScheduled(at);
    const current = await this.find(id);
    if (!editableStatuses.has(current.status)) {
      throw new DomainError('PORTAL_CONTENT_NOT_EDITABLE', '已撤回内容不可继续编辑');
    }
    if (!hasWriteChange(input)) {
      throw new DomainError('PORTAL_CONTENT_UPDATE_EMPTY', '至少需要修改一个内容字段');
    }
    const expectedRevision = current.currentRevision;
    const content = mergeWriteValues(current, input);
    if (content.publishedAt) assertOfflineAfterPublish(content.offlineAt, content.publishedAt);
    content.currentRevision += 1;
    content.updatedAt = at;
    await this.commit(content, expectedRevision, 'UPDATED', actor, at, {});
    return toPortalAdminContentDetail(content);
  }

  async publish(
    id: string,
    input: PortalContentPublishInput,
    actor: SessionUser,
    at = new Date(),
  ): Promise<PortalAdminContentDetail> {
    await this.repository.publishDueScheduled(at);
    const content = await this.find(id);
    if (!editableStatuses.has(content.status)) {
      throw new DomainError('PORTAL_CONTENT_NOT_PUBLISHABLE', '当前内容状态不允许发布');
    }
    const expectedRevision = content.currentRevision;
    const publishAt = parseDate(input.publishAt, at, '发布时间');
    assertOfflineAfterPublish(content.offlineAt, publishAt);
    content.status = publishAt.getTime() > at.getTime() ? 'SCHEDULED' : 'PUBLISHED';
    content.publishedAt = publishAt;
    content.withdrawnAt = null;
    content.currentRevision += 1;
    content.updatedAt = at;
    const action: PortalContentAuditAction =
      content.status === 'SCHEDULED' ? 'SCHEDULED' : 'PUBLISHED';
    await this.commit(content, expectedRevision, action, actor, at, {
      publishAt: publishAt.toISOString(),
    });
    return toPortalAdminContentDetail(content);
  }

  async withdraw(
    id: string,
    actor: SessionUser,
    at = new Date(),
  ): Promise<PortalAdminContentDetail> {
    await this.repository.publishDueScheduled(at);
    const content = await this.find(id);
    if (content.status !== 'PUBLISHED' && content.status !== 'SCHEDULED') {
      throw new DomainError('PORTAL_CONTENT_NOT_WITHDRAWABLE', '仅已发布或定时发布内容可以撤回');
    }
    const expectedRevision = content.currentRevision;
    content.status = 'WITHDRAWN';
    content.withdrawnAt = at;
    content.currentRevision += 1;
    content.updatedAt = at;
    await this.commit(content, expectedRevision, 'WITHDRAWN', actor, at, {});
    return toPortalAdminContentDetail(content);
  }

  async audit(id: string, at = new Date()): Promise<PortalContentAuditTrail> {
    await this.repository.publishDueScheduled(at);
    await this.find(id);
    const events = await this.repository.listAudit(id);
    return { contentId: id, events: events.map(toPortalContentAuditEvent) };
  }

  private async find(id: string): Promise<PortalContent> {
    const content = await this.repository.findById(id);
    if (!content) {
      throw new NotFoundException({
        code: 'PORTAL_CONTENT_NOT_FOUND',
        message: '门户内容不存在',
      });
    }
    return content;
  }

  private async commit(
    content: PortalContent,
    expectedRevision: number | null,
    action: PortalContentAuditAction,
    actor: SessionUser,
    at: Date,
    details: Record<string, unknown>,
  ): Promise<void> {
    const audit: PortalContentAudit = {
      id: randomUUID(),
      contentId: content.id,
      action,
      actorId: actor.id,
      actorName: actor.displayName,
      actorDepartmentName: actor.departmentName || null,
      revision: content.currentRevision,
      occurredAt: at,
      details,
    };
    const record: PortalContentMutationRecord = {
      content,
      expectedRevision,
      audit,
      revision: {
        id: randomUUID(),
        contentId: content.id,
        revision: content.currentRevision,
        snapshot: createPortalContentSnapshot(content),
        createdAt: at,
      },
    };
    if (!(await this.repository.commit(record))) {
      throw new DomainError(
        'PORTAL_CONTENT_REVISION_CONFLICT',
        '内容已被其他用户修改，请刷新后重试',
      );
    }
  }
}

function requireCreateValues(input: PortalContentWriteInput) {
  const category = input.category;
  const title = normalizeRequiredText(input.title, '标题');
  const summary = normalizeRequiredText(input.summary, '摘要');
  const body = sanitizePortalContentBody(normalizeRequiredText(input.body, '正文'));
  const audienceType = input.audienceType;
  if (!category) throw new DomainError('PORTAL_CONTENT_CATEGORY_REQUIRED', '请选择内容栏目');
  if (!audienceType) throw new DomainError('PORTAL_CONTENT_AUDIENCE_REQUIRED', '请选择发布受众');
  const audienceIds = normalizeAudienceIds(audienceType, input.audienceIds ?? []);
  return {
    category,
    title,
    summary,
    body,
    audienceType,
    audienceIds,
    pinned: input.pinned ?? false,
    requiresReceipt: input.requiresReceipt ?? false,
    coverImageUrl: normalizeNullableText(input.coverImageUrl),
    attachments: normalizeStringList(input.attachments ?? []),
    offlineAt: parseOptionalDate(input.offlineAt, '下线时间'),
  };
}

function mergeWriteValues(content: PortalContent, input: PortalContentWriteInput): PortalContent {
  const audienceType = input.audienceType ?? content.audienceType;
  const audienceIds = normalizeAudienceIds(
    audienceType,
    input.audienceIds ?? (input.audienceType ? [] : content.audienceIds),
  );
  return {
    ...content,
    category: input.category ?? content.category,
    title: input.title === undefined ? content.title : normalizeRequiredText(input.title, '标题'),
    summary:
      input.summary === undefined ? content.summary : normalizeRequiredText(input.summary, '摘要'),
    body:
      input.body === undefined
        ? content.body
        : sanitizePortalContentBody(normalizeRequiredText(input.body, '正文')),
    audienceType,
    audienceIds,
    pinned: input.pinned ?? content.pinned,
    requiresReceipt: input.requiresReceipt ?? content.requiresReceipt,
    coverImageUrl:
      input.coverImageUrl === undefined
        ? content.coverImageUrl
        : normalizeNullableText(input.coverImageUrl),
    attachments:
      input.attachments === undefined
        ? content.attachments
        : normalizeStringList(input.attachments),
    offlineAt:
      input.offlineAt === undefined
        ? content.offlineAt
        : parseOptionalDate(input.offlineAt, '下线时间'),
  };
}

function normalizeAudienceIds(type: string, values: string[]): string[] {
  const ids = normalizeStringList(values);
  if (type === 'ALL' && ids.length > 0) {
    throw new DomainError('PORTAL_CONTENT_AUDIENCE_INVALID', '全员发布不能指定额外受众');
  }
  if (type !== 'ALL' && ids.length === 0) {
    throw new DomainError('PORTAL_CONTENT_AUDIENCE_INVALID', '定向发布至少需要选择一个受众');
  }
  return ids;
}

function normalizeStringList(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeRequiredText(value: string | undefined, label: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new DomainError('PORTAL_CONTENT_FIELD_REQUIRED', `${label}不能为空`);
  return normalized;
}

function normalizeNullableText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeQueryText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function parseOptionalDate(value: string | null | undefined, label: string): Date | null {
  if (!value) return null;
  return parseDate(value, new Date(), label);
}

function parseDate(value: string | null | undefined, fallback: Date, label: string): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new DomainError('PORTAL_CONTENT_DATE_INVALID', `${label}格式不正确`);
  }
  return parsed;
}

function assertOfflineAfterPublish(offlineAt: Date | null, publishAt: Date): void {
  if (offlineAt && offlineAt.getTime() <= publishAt.getTime()) {
    throw new DomainError('PORTAL_CONTENT_OFFLINE_INVALID', '下线时间必须晚于发布时间');
  }
}

function positiveInteger(value: number | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function hasWriteChange(input: PortalContentWriteInput): boolean {
  return Object.values(input).some((value) => value !== undefined);
}
