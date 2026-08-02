import {
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import type {
  ApprovalOpinion,
  ApprovalTaskSummary,
  BusinessModule,
  DocumentType,
  SessionUser,
  WorkflowOverview,
} from '@oa/contracts';
import { requiredBusinessModulePermissions } from '@oa/contracts';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { DomainError } from '../../errors/domain-error';
import {
  assertBusinessModulePermission,
  hasBusinessModulePermission,
  scopedBusinessPermission,
} from '../../auth/business-module-permission';
import { FormDesignService } from '../../form-design/application/form-design.service';
import { IamService } from '../../iam/application/iam.service';
import { ProcessDesignService } from '../../process-design/application/process-design.service';
import { DocumentIndexEntity } from '../infrastructure/document-index.entity';
import { WorkflowCommandEntity } from '../infrastructure/workflow-command.entity';
import { WorkflowDefinitionEntity } from '../infrastructure/workflow-definition.entity';
import { LEGACY_WORKFLOW_DEFINITIONS } from '../infrastructure/legacy-workflow-definitions';
import { WorkflowOpinionEntity } from '../infrastructure/workflow-opinion.entity';
import { WorkflowTaskCandidateEntity } from '../infrastructure/workflow-task-candidate.entity';
import { WorkflowTaskEntity } from '../infrastructure/workflow-task.entity';
import {
  findCompletedWorkflowTasks,
  findPendingWorkflowTasks,
} from '../infrastructure/workflow-task-read.repository';
import {
  legacyRuntimeDefinition,
  publishedRuntimeDefinition,
  type RuntimeWorkflowDefinition,
  type RuntimeWorkflowTask,
  storedTaskAssigneeRule,
  taskAssigneeColumns,
} from './workflow-runtime-definition';
import { buildOpinionSnapshot } from './workflow-opinion.snapshot';
import { toApprovalOpinion, toDocumentSummary, toTaskSummary } from './workflow-read-model.mapper';
import { WorkflowCandidateService } from './workflow-candidate.service';
import { DocumentNumberService } from './document-number.service';

interface RegisterDraftInput {
  id: string;
  documentType: DocumentType;
  module: BusinessModule;
  title: string;
  applicantId: string;
  departmentId: string;
}

@Injectable()
export class DocumentWorkflowService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DocumentWorkflowService.name);

  constructor(
    @InjectRepository(DocumentIndexEntity)
    private readonly documents: Repository<DocumentIndexEntity>,
    @InjectRepository(WorkflowDefinitionEntity)
    private readonly definitions: Repository<WorkflowDefinitionEntity>,
    @InjectRepository(WorkflowTaskEntity)
    private readonly tasks: Repository<WorkflowTaskEntity>,
    @InjectRepository(WorkflowTaskCandidateEntity)
    private readonly candidates: Repository<WorkflowTaskCandidateEntity>,
    @InjectRepository(WorkflowOpinionEntity)
    private readonly opinions: Repository<WorkflowOpinionEntity>,
    @Inject(IamService)
    private readonly iam: IamService,
    @Inject(WorkflowCandidateService)
    private readonly candidateService: WorkflowCandidateService,
    @Inject(FormDesignService)
    private readonly formDesign: FormDesignService,
    @Inject(ProcessDesignService)
    private readonly processDesign: ProcessDesignService,
    @Inject(DocumentNumberService)
    private readonly documentNumbers: DocumentNumberService,
    @Inject(DataSource)
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedLegacyDefinitions();
    await this.iam.ensureLegacyAssignments();
    await this.backfillPendingTaskCandidates();
  }

  async registerDraft(input: RegisterDraftInput): Promise<DocumentIndexEntity> {
    const [form, process] = await Promise.all([
      this.formDesign.findPublishedByDocumentType(input.documentType),
      this.processDesign.findPublishedByDocumentType(input.documentType),
    ]);
    const legacy = process ? null : await this.findDefinition(input.documentType);
    return this.documents.save({
      ...input,
      status: 'DRAFT',
      revision: 1,
      currentStep: null,
      workflowCode: process?.definition.code ?? legacy!.code,
      processVersionId: process?.version.id ?? null,
      formVersionId: form?.version.id ?? null,
    });
  }

  async updateDraftTitle(documentId: string, title: string, user: SessionUser): Promise<void> {
    const document = await this.getEditable(documentId, user);
    document.title = title;
    document.revision += 1;
    await this.documents.save(document);
  }

  async getEditable(documentId: string, user: SessionUser): Promise<DocumentIndexEntity> {
    const document = await this.getDocument(documentId);
    assertBusinessModulePermission(user, document.module, 'CREATE');
    if (document.applicantId !== user.id) {
      throw new ForbiddenException('只能修改本人发起的单据');
    }
    if (!['DRAFT', 'RETURNED'].includes(document.status)) {
      throw new DomainError('DOCUMENT_NOT_EDITABLE', '当前状态不允许修改');
    }
    return document;
  }

  async submit(
    documentId: string,
    requestId: string,
    user: SessionUser,
  ): Promise<DocumentIndexEntity> {
    return this.dataSource.transaction(async (manager) => {
      const documentRepository = manager.getRepository(DocumentIndexEntity);
      const document = await documentRepository.findOneBy({ id: documentId });
      if (!document) throw new NotFoundException('单据不存在');
      if (document.applicantId !== user.id) {
        throw new ForbiddenException('只能提交本人发起的单据');
      }
      assertBusinessModulePermission(user, document.module, 'CREATE');
      const commandRepository = manager.getRepository(WorkflowCommandEntity);
      if (await commandRepository.findOneBy({ requestId, documentId })) return document;
      if (!['DRAFT', 'RETURNED'].includes(document.status)) {
        throw new DomainError('DOCUMENT_NOT_SUBMITTABLE', '当前状态不允许提交');
      }

      const definition = await this.loadRuntimeDefinition(document);
      await this.createPendingTask(manager, document, 0, definition.tasks[0]);
      const prefix = this.documentNumbers.documentNumberPrefix(
        document.documentType as DocumentType,
      );
      const documentNo =
        document.documentNo ??
        (prefix ? await this.documentNumbers.generate(manager, prefix) : null);
      const submitted = await documentRepository.update(
        { id: document.id, status: document.status, revision: document.revision },
        { status: 'IN_REVIEW', currentStep: 0, revision: document.revision + 1, documentNo },
      );
      if (submitted.affected !== 1) {
        throw new DomainError('DOCUMENT_STATE_CHANGED', '单据状态已变化，请刷新后重试');
      }
      await this.recordOpinion(manager.getRepository(WorkflowOpinionEntity), {
        documentId,
        taskId: '',
        actor: user,
        action: 'SUBMIT',
        comment: '提交审批',
        node: null,
      });
      await commandRepository.save({ requestId, documentId });
      return documentRepository.findOneByOrFail({ id: documentId });
    });
  }

  async completeTask(
    taskId: string,
    requestId: string,
    comment: string,
    action: 'APPROVE' | 'RETURN',
    user: SessionUser,
  ): Promise<DocumentIndexEntity> {
    return this.dataSource.transaction(async (manager) => {
      const taskRepository = manager.getRepository(WorkflowTaskEntity);
      const task = await taskRepository.findOneBy({ id: taskId });
      if (!task) throw new NotFoundException('待办不存在');
      await this.assertTaskCandidate(manager, task.id, user.id);

      const documentRepository = manager.getRepository(DocumentIndexEntity);
      const document = await documentRepository.findOneByOrFail({ id: task.documentId });
      assertBusinessModulePermission(user, document.module, 'VIEW');

      const commandRepository = manager.getRepository(WorkflowCommandEntity);
      const duplicate = await commandRepository.findOneBy({
        requestId,
        documentId: task.documentId,
      });
      if (duplicate) return document;
      if (task.status !== 'PENDING') {
        throw new DomainError('TASK_ALREADY_COMPLETED', '该待办已被处理');
      }

      const definition = await this.loadRuntimeDefinition(document);
      const node = definition.tasks[task.stepIndex];
      const completed = await taskRepository.update(
        { id: task.id, status: 'PENDING' },
        { status: 'COMPLETED', completedBy: user.id },
      );
      if (completed.affected !== 1) {
        throw new DomainError('TASK_ALREADY_COMPLETED', '该待办已被处理');
      }
      await this.recordOpinion(manager.getRepository(WorkflowOpinionEntity), {
        documentId: document.id,
        taskId: task.id,
        actor: user,
        action,
        comment,
        node,
      });

      if (action === 'RETURN') {
        document.status = 'RETURNED';
        document.currentStep = null;
      } else {
        const nextStep = task.stepIndex + 1;
        if (nextStep >= definition.tasks.length) {
          document.status = 'APPROVED';
          document.currentStep = null;
        } else {
          await this.createPendingTask(manager, document, nextStep, definition.tasks[nextStep]);
          document.currentStep = nextStep;
        }
      }
      document.revision += 1;
      await documentRepository.save(document);
      await commandRepository.save({ requestId, documentId: document.id });
      return document;
    });
  }

  async listTasks(user: SessionUser): Promise<ApprovalTaskSummary[]> {
    const tasks = await findPendingWorkflowTasks(this.tasks, user);
    return this.toTaskSummaries(tasks);
  }

  async listCompletedTasks(user: SessionUser): Promise<ApprovalTaskSummary[]> {
    const tasks = await findCompletedWorkflowTasks(this.tasks, user);
    return this.toTaskSummaries(tasks);
  }

  async listMyDocuments(user: SessionUser): Promise<DocumentIndexEntity[]> {
    const documents = await this.documents.find({
      where: { applicantId: user.id },
      order: { updatedAt: 'DESC' },
    });
    return documents.filter((document) =>
      hasBusinessModulePermission(user, document.module, 'VIEW'),
    );
  }

  async history(documentId: string, user: SessionUser): Promise<ApprovalOpinion[]> {
    await this.getViewableDocument(documentId, user);
    return this.readOpinions(documentId);
  }

  /** Trusted application services call this only after enforcing their command/query access. */
  async readOpinions(documentId: string): Promise<ApprovalOpinion[]> {
    const opinions = await this.opinions.find({
      where: { documentId },
      order: { createdAt: 'ASC' },
    });
    return opinions.map(toApprovalOpinion);
  }

  async overview(documentId: string, user: SessionUser): Promise<WorkflowOverview> {
    const document = await this.getViewableDocument(documentId, user);
    const definition = await this.loadRuntimeDefinition(document);
    const currentTask = await this.tasks.findOne({
      where: { documentId, status: 'PENDING' },
      order: { createdAt: 'DESC' },
    });
    const currentNode = currentTask ? definition.tasks[currentTask.stepIndex] : null;
    return {
      document: toDocumentSummary(document),
      definition: {
        code: definition.code,
        name: definition.name,
        version: definition.version,
        processVersionId: definition.processVersionId,
        steps: definition.tasks.map((task) => task.name),
      },
      currentTask: currentTask
        ? toTaskSummary(currentTask, document, currentNode?.name ?? null)
        : null,
      opinions: await this.readOpinions(documentId),
    };
  }

  async getDocument(documentId: string): Promise<DocumentIndexEntity> {
    const document = await this.documents.findOneBy({ id: documentId });
    if (!document) throw new NotFoundException('单据不存在');
    return document;
  }

  /** 校验用户是当前待审节点的固化办理人，返回单据（用于审批人改单等节点内操作）。 */
  async getModeratableDocument(documentId: string, user: SessionUser): Promise<DocumentIndexEntity> {
    const document = await this.getDocument(documentId);
    const task = await this.tasks.findOne({
      where: { documentId, status: 'PENDING' },
      order: { createdAt: 'DESC' },
    });
    if (!task) {
      throw new DomainError('WORKFLOW_NOT_IN_REVIEW', '单据不在审批流转中');
    }
    if (!(await this.candidates.existsBy({ taskId: task.id, userId: user.id }))) {
      throw new ForbiddenException('当前用户不是该单据当前审批节点的办理人');
    }
    return document;
  }

  async getViewableDocument(documentId: string, user: SessionUser): Promise<DocumentIndexEntity> {
    const document = await this.getDocument(documentId);
    assertBusinessModulePermission(user, document.module, 'VIEW');
    if (document.applicantId === user.id) return document;
    if (await this.tasks.existsBy({ documentId, completedBy: user.id })) return document;

    const isCurrentCandidate = await this.candidates
      .createQueryBuilder('candidate')
      .innerJoin(
        WorkflowTaskEntity,
        'task',
        'task.id = candidate.taskId AND task.documentId = :documentId AND task.status = :status',
        { documentId, status: 'PENDING' },
      )
      .where('candidate.userId = :userId', { userId: user.id })
      .getExists();
    if (isCurrentCandidate) {
      return document;
    }
    if (
      await this.iam.canAccessResource(
        user.id,
        scopedBusinessPermission(document.module, 'VIEW'),
        document.applicantId,
        document.departmentId,
      )
    ) {
      return document;
    }
    throw new ForbiddenException('当前用户无权查看该单据');
  }

  private async loadRuntimeDefinition(
    document: DocumentIndexEntity,
  ): Promise<RuntimeWorkflowDefinition> {
    if (!document.processVersionId) {
      const legacy = await this.definitions.findOneBy({ code: document.workflowCode });
      if (!legacy) throw new DomainError('WORKFLOW_NOT_CONFIGURED', '单据审批流程不存在');
      return legacyRuntimeDefinition(legacy);
    }
    const version = await this.processDesign.getVersion(document.processVersionId);
    const definition = await this.processDesign.get(version.definitionId);
    return publishedRuntimeDefinition(definition, version);
  }

  private async createPendingTask(
    manager: EntityManager,
    document: DocumentIndexEntity,
    stepIndex: number,
    node: RuntimeWorkflowTask | undefined,
  ): Promise<WorkflowTaskEntity> {
    if (!node) throw new DomainError('WORKFLOW_STEP_MISSING', '审批流程缺少办理节点');
    const documentViewPermissions = requiredBusinessModulePermissions(document.module, 'VIEW');
    const resolution = await this.candidateService.resolve(
      node.assigneeRule,
      document.departmentId,
      document.applicantId,
      documentViewPermissions,
    );
    if (resolution.resolvedCount === 0) {
      throw new DomainError('WORKFLOW_ASSIGNEE_EMPTY', '审批节点未解析到有效办理人', {
        processNodeId: node.id,
        processNodeName: node.name,
      });
    }
    if (resolution.candidates.length === 0) {
      throw new DomainError(
        'WORKFLOW_ASSIGNEE_PERMISSION_MISSING',
        '审批节点候选人缺少审批或业务查看权限',
        {
          processNodeId: node.id,
          processNodeName: node.name,
          requiredPermission: 'WORKFLOW_APPROVE',
          requiredPermissions: ['WORKFLOW_APPROVE', ...documentViewPermissions],
          resolvedCandidateCount: resolution.resolvedCount,
        },
      );
    }
    const task = await manager.getRepository(WorkflowTaskEntity).save({
      id: randomUUID(),
      documentId: document.id,
      stepIndex,
      processNodeId: node.id,
      ...taskAssigneeColumns(node.assigneeRule),
      status: 'PENDING',
      completedBy: null,
    });
    await this.candidateService.insertSnapshot(
      manager.getRepository(WorkflowTaskCandidateEntity),
      task.id,
      node.assigneeRule,
      document.departmentId,
      resolution.candidates,
    );
    return task;
  }

  private async assertTaskCandidate(
    manager: EntityManager,
    taskId: string,
    userId: string,
  ): Promise<void> {
    if (!(await manager.getRepository(WorkflowTaskCandidateEntity).existsBy({ taskId, userId }))) {
      throw new ForbiddenException('当前用户不是该待办的固化办理人');
    }
  }

  private async toTaskSummaries(tasks: WorkflowTaskEntity[]): Promise<ApprovalTaskSummary[]> {
    if (tasks.length === 0) return [];
    const documents = await this.documents.findBy({ id: In(tasks.map((task) => task.documentId)) });
    const documentMap = new Map(documents.map((document) => [document.id, document]));
    const definitionCache = new Map<string, Promise<RuntimeWorkflowDefinition>>();
    return Promise.all(
      tasks.map(async (task) => {
        const document = documentMap.get(task.documentId);
        if (!document) throw new DomainError('DOCUMENT_INDEX_MISSING', '待办关联单据不存在');
        const key = document.processVersionId ?? `legacy:${document.workflowCode}`;
        const pending = definitionCache.get(key) ?? this.loadRuntimeDefinition(document);
        definitionCache.set(key, pending);
        const definition = await pending;
        return toTaskSummary(task, document, definition.tasks[task.stepIndex]?.name ?? null);
      }),
    );
  }

  private async recordOpinion(
    repository: Repository<WorkflowOpinionEntity>,
    input: {
      documentId: string;
      taskId: string;
      actor: SessionUser;
      action: 'SUBMIT' | 'APPROVE' | 'RETURN';
      comment: string;
      node: RuntimeWorkflowTask | null | undefined;
    },
  ): Promise<void> {
    await repository.save(buildOpinionSnapshot(input));
  }

  private async seedLegacyDefinitions(): Promise<void> {
    if (process.env.NODE_ENV === 'production') return;
    const existing = new Set((await this.definitions.find()).map((definition) => definition.code));
    const missing = LEGACY_WORKFLOW_DEFINITIONS.filter(
      (definition) => !existing.has(definition.code),
    );
    if (missing.length > 0) await this.definitions.save(missing);
  }

  private async backfillPendingTaskCandidates(): Promise<void> {
    const pending = await this.tasks.findBy({ status: 'PENDING' });
    if (pending.length === 0) return;
    const existing = await this.candidates.findBy({ taskId: In(pending.map((task) => task.id)) });
    const assignedTaskIds = new Set(existing.map((candidate) => candidate.taskId));
    for (const task of pending.filter((item) => !assignedTaskIds.has(item.id))) {
      const document = await this.documents.findOneBy({ id: task.documentId });
      if (!document) continue;
      const rule = storedTaskAssigneeRule(task);
      const resolution = await this.candidateService.resolve(
        rule,
        document.departmentId,
        document.applicantId,
        requiredBusinessModulePermissions(document.module, 'VIEW'),
      );
      if (resolution.resolvedCount === 0) {
        this.logger.warn(`旧待办 ${task.id} 未解析到候选人，保留待管理员修复 IAM 配置`);
        continue;
      }
      if (resolution.candidates.length === 0) {
        this.logger.warn(
          `旧待办 ${task.id} 的候选人缺少审批或 ${document.module} 查看权限，保留待管理员修复授权`,
        );
        continue;
      }
      await this.candidateService.insertSnapshot(
        this.candidates,
        task.id,
        rule,
        document.departmentId,
        resolution.candidates,
      );
    }
  }

  private async findDefinition(documentType: DocumentType): Promise<WorkflowDefinitionEntity> {
    const definition = await this.definitions.findOneBy({ documentType, active: true });
    if (!definition) {
      throw new DomainError('WORKFLOW_NOT_CONFIGURED', '该单据未配置审批流程');
    }
    return definition;
  }
}
