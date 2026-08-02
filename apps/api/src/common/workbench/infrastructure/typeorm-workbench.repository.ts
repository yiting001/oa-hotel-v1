import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type {
  BusinessModule,
  DocumentStatus,
  DocumentType,
  WorkbenchBox,
  WorkbenchItem,
} from '@oa/contracts';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { DepartmentEntity } from '../../auth/department.entity';
import { UserEntity } from '../../auth/user.entity';
import { DocumentIndexEntity } from '../../workflow/infrastructure/document-index.entity';
import { WorkflowCopyEntity } from '../../workflow/infrastructure/workflow-copy.entity';
import { WorkflowTaskCandidateEntity } from '../../workflow/infrastructure/workflow-task-candidate.entity';
import { WorkflowTaskEntity } from '../../workflow/infrastructure/workflow-task.entity';
import type { WorkbenchRepository, WorkbenchRepositoryPage } from '../domain/workbench.repository';
import type { WorkbenchQuery, WorkbenchRepositoryContext } from '../domain/workbench.types';
import { DocumentFollowEntity } from './document-follow.entity';

interface RawWorkbenchItem {
  id: string;
  taskId: string | null;
  documentId: string;
  documentType: string;
  module: string;
  documentTitle: string;
  documentStatus: string;
  applicantId: string;
  applicantName: string;
  departmentId: string;
  departmentName: string;
  processNodeId: string | null;
  currentStep: number | string | null;
  assigneeRole: string | null;
  followedAt: Date | string | null;
  copyId: string | null;
  copySenderId: string | null;
  copySenderName: string | null;
  copyReadAt: Date | string | null;
  revision: number | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

@Injectable()
export class TypeOrmWorkbenchRepository implements WorkbenchRepository {
  constructor(
    @InjectRepository(DocumentIndexEntity)
    private readonly documents: Repository<DocumentIndexEntity>,
  ) {}

  async count(box: WorkbenchBox, context: WorkbenchRepositoryContext): Promise<number> {
    if (!this.canQuery(box, context)) return 0;
    return this.countItems(this.createBoxQuery(box, context), box);
  }

  async findPage(
    query: WorkbenchQuery,
    context: WorkbenchRepositoryContext,
  ): Promise<WorkbenchRepositoryPage> {
    if (!this.canQuery(query.box, context)) return { total: 0, items: [] };
    const builder = this.applyFilters(this.createBoxQuery(query.box, context), query);
    const total = await this.countItems(builder, query.box);
    if (total === 0) return { total, items: [] };

    const expressions = boxExpressions(query.box);
    const taskBox = this.isTaskBox(query.box);
    const rows = await builder
      .select(expressions.id, 'id')
      .addSelect(taskBox ? 'task.id' : 'NULL', 'taskId')
      .addSelect('document.id', 'documentId')
      .addSelect('document.documentType', 'documentType')
      .addSelect('document.module', 'module')
      .addSelect('document.title', 'documentTitle')
      .addSelect('document.status', 'documentStatus')
      .addSelect('document.applicantId', 'applicantId')
      .addSelect('COALESCE(applicant.displayName, document.applicantId)', 'applicantName')
      .addSelect('document.departmentId', 'departmentId')
      .addSelect('COALESCE(department.name, document.departmentId)', 'departmentName')
      .addSelect(taskBox ? 'task.processNodeId' : 'NULL', 'processNodeId')
      .addSelect(taskBox ? 'task.stepIndex' : 'document.currentStep', 'currentStep')
      .addSelect(taskBox ? 'task.assigneeRole' : 'NULL', 'assigneeRole')
      .addSelect(query.box === 'FOLLOWING' ? 'follow.createdAt' : 'NULL', 'followedAt')
      .addSelect(query.box === 'COPIED' ? 'copy.id' : 'NULL', 'copyId')
      .addSelect(query.box === 'COPIED' ? 'copy.senderId' : 'NULL', 'copySenderId')
      .addSelect(query.box === 'COPIED' ? 'copy.senderName' : 'NULL', 'copySenderName')
      .addSelect(query.box === 'COPIED' ? 'copy.readAt' : 'NULL', 'copyReadAt')
      .addSelect('document.revision', 'revision')
      .addSelect(expressions.createdAt, 'createdAt')
      .addSelect(expressions.updatedAt, 'updatedAt')
      .orderBy(expressions.updatedAt, 'DESC')
      .addOrderBy(expressions.id, 'DESC')
      .offset((query.page - 1) * query.pageSize)
      .limit(query.pageSize)
      .getRawMany<RawWorkbenchItem>();

    return { total, items: rows.map((row) => this.mapRow(row, query.box)) };
  }

  private createBoxQuery(
    box: WorkbenchBox,
    context: WorkbenchRepositoryContext,
  ): SelectQueryBuilder<DocumentIndexEntity> {
    const builder = this.documents
      .createQueryBuilder('document')
      .leftJoin(UserEntity, 'applicant', 'applicant.id = document.applicantId')
      .leftJoin(DepartmentEntity, 'department', 'department.id = document.departmentId')
      .where('document.module IN (:...allowedModules)', {
        allowedModules: context.allowedModules,
      });

    if (box === 'PENDING') {
      return builder
        .innerJoin(
          WorkflowTaskEntity,
          'task',
          'task.documentId = document.id AND task.status = :taskStatus',
          { taskStatus: 'PENDING' },
        )
        .innerJoin(
          WorkflowTaskCandidateEntity,
          'candidate',
          'candidate.taskId = task.id AND candidate.userId = :userId',
          { userId: context.userId },
        );
    }
    if (box === 'COMPLETED') {
      return builder.innerJoin(
        WorkflowTaskEntity,
        'task',
        'task.documentId = document.id AND task.status = :taskStatus AND task.completedBy = :userId',
        { taskStatus: 'COMPLETED', userId: context.userId },
      );
    }
    if (box === 'FOLLOWING') {
      builder.innerJoin(
        DocumentFollowEntity,
        'follow',
        'follow.documentId = document.id AND follow.userId = :userId',
        { userId: context.userId },
      );
      return this.applyCurrentVisibility(builder, context);
    }
    if (box === 'COPIED') {
      builder.innerJoin(
        WorkflowCopyEntity,
        'copy',
        'copy.documentId = document.id AND copy.recipientId = :userId',
        { userId: context.userId },
      );
      return this.applyCurrentVisibility(builder, context);
    }

    builder.andWhere('document.applicantId = :userId', { userId: context.userId });
    return box === 'DRAFTS'
      ? builder.andWhere('document.status = :draftStatus', { draftStatus: 'DRAFT' })
      : builder;
  }

  private async countItems(
    builder: SelectQueryBuilder<DocumentIndexEntity>,
    box: WorkbenchBox,
  ): Promise<number> {
    const identity = boxExpressions(box).id;
    const row = await builder
      .clone()
      .select(`COUNT(DISTINCT ${identity})`, 'total')
      .getRawOne<{ total: number | string }>();
    return Number(row?.total ?? 0);
  }

  private applyFilters(
    builder: SelectQueryBuilder<DocumentIndexEntity>,
    query: WorkbenchQuery,
  ): SelectQueryBuilder<DocumentIndexEntity> {
    if (query.keyword) {
      builder.andWhere(
        `(instr(lower(document.title), lower(:keyword)) > 0
          OR instr(lower(COALESCE(applicant.displayName, '')), lower(:keyword)) > 0
          OR instr(lower(COALESCE(department.name, '')), lower(:keyword)) > 0)`,
        { keyword: query.keyword },
      );
    }
    if (query.documentType) {
      builder.andWhere('document.documentType = :documentType', {
        documentType: query.documentType,
      });
    }
    if (query.applicantId) {
      builder.andWhere('document.applicantId = :applicantId', {
        applicantId: query.applicantId,
      });
    }
    if (query.departmentId) {
      builder.andWhere('document.departmentId = :departmentId', {
        departmentId: query.departmentId,
      });
    }
    if (query.status) {
      builder.andWhere('document.status = :documentStatus', { documentStatus: query.status });
    }
    const updatedExpression = boxExpressions(query.box).updatedAt;
    if (query.dateFrom) {
      builder.andWhere(`${updatedExpression} >= :dateFrom`, { dateFrom: query.dateFrom });
    }
    if (query.dateTo) {
      builder.andWhere(`${updatedExpression} <= :dateTo`, { dateTo: query.dateTo });
    }
    return builder;
  }

  private mapRow(row: RawWorkbenchItem, box: WorkbenchBox): WorkbenchItem {
    return {
      id: row.id,
      box,
      taskId: row.taskId,
      documentId: row.documentId,
      documentType: row.documentType as DocumentType,
      module: row.module as BusinessModule,
      documentTitle: row.documentTitle,
      documentStatus: row.documentStatus as DocumentStatus,
      applicantId: row.applicantId,
      applicantName: row.applicantName,
      departmentId: row.departmentId,
      departmentName: row.departmentName,
      processNodeId: row.processNodeId,
      processNodeName: null,
      currentStep: nullableNumber(row.currentStep),
      assigneeRole: row.assigneeRole,
      followedAt: nullableIsoDate(row.followedAt),
      copyId: row.copyId,
      copySenderId: row.copySenderId,
      copySenderName: row.copySenderName,
      copyReadAt: nullableIsoDate(row.copyReadAt),
      revision: Number(row.revision),
      createdAt: isoDate(row.createdAt),
      updatedAt: isoDate(row.updatedAt),
    };
  }

  private isTaskBox(box: WorkbenchBox): boolean {
    return box === 'PENDING' || box === 'COMPLETED';
  }

  private canQuery(box: WorkbenchBox, context: WorkbenchRepositoryContext): boolean {
    return (
      context.allowedModules.length > 0 &&
      (box !== 'PENDING' || context.canApprove) &&
      (box !== 'FOLLOWING' || context.canFollow)
    );
  }

  private applyCurrentVisibility(
    builder: SelectQueryBuilder<DocumentIndexEntity>,
    context: WorkbenchRepositoryContext,
  ): SelectQueryBuilder<DocumentIndexEntity> {
    const clauses = [
      'document.applicantId = :visibilityUserId',
      `EXISTS (
        SELECT 1 FROM workflow_tasks visibility_completed
        WHERE visibility_completed.documentId = document.id
          AND visibility_completed.completedBy = :visibilityUserId
      )`,
      `EXISTS (
        SELECT 1 FROM workflow_task_candidates visibility_candidate
        INNER JOIN workflow_tasks visibility_task ON visibility_task.id = visibility_candidate.taskId
        WHERE visibility_candidate.userId = :visibilityUserId
          AND visibility_task.documentId = document.id
          AND visibility_task.status = 'PENDING'
      )`,
    ];
    const parameters: Record<string, unknown> = { visibilityUserId: context.userId };
    context.allowedModules.forEach((module, index) => {
      const scope = context.moduleScopes[module];
      if (!scope) return;
      const moduleParameter = `visibilityModule${index}`;
      parameters[moduleParameter] = module;
      if (scope.all) clauses.push(`document.module = :${moduleParameter}`);
      if (scope.self) {
        clauses.push(
          `(document.module = :${moduleParameter} AND document.applicantId = :visibilityUserId)`,
        );
      }
      if (scope.departmentIds.length > 0) {
        const departmentsParameter = `visibilityDepartments${index}`;
        parameters[departmentsParameter] = scope.departmentIds;
        clauses.push(
          `(document.module = :${moduleParameter} AND document.departmentId IN (:...${departmentsParameter}))`,
        );
      }
    });
    return builder.andWhere(`(${clauses.join(' OR ')})`, parameters);
  }
}

function boxExpressions(box: WorkbenchBox): {
  id: string;
  createdAt: string;
  updatedAt: string;
} {
  if (box === 'PENDING' || box === 'COMPLETED') {
    return { id: 'task.id', createdAt: 'task.createdAt', updatedAt: 'task.updatedAt' };
  }
  if (box === 'FOLLOWING') {
    return { id: 'document.id', createdAt: 'follow.createdAt', updatedAt: 'follow.createdAt' };
  }
  if (box === 'COPIED') {
    return { id: 'copy.id', createdAt: 'copy.createdAt', updatedAt: 'copy.createdAt' };
  }
  return { id: 'document.id', createdAt: 'document.createdAt', updatedAt: 'document.updatedAt' };
}

function nullableNumber(value: number | string | null): number | null {
  return value === null || value === undefined ? null : Number(value);
}

function isoDate(value: Date | string): string {
  if (value instanceof Date) return value.toISOString();
  const normalized = /(?:Z|[+-]\d{2}:\d{2})$/.test(value) ? value : `${value.replace(' ', 'T')}Z`;
  return new Date(normalized).toISOString();
}

function nullableIsoDate(value: Date | string | null): string | null {
  return value === null || value === undefined ? null : isoDate(value);
}
