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
  WorkflowBranchSummary,
  WorkflowOverview,
} from '@oa/contracts';
import { requiredBusinessModulePermissions } from '@oa/contracts';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
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
import type { ApprovalCandidateResolution } from './workflow-candidate.service';
import { DocumentNumberService } from './document-number.service';

interface RegisterDraftInput {
  id: string;
  documentType: DocumentType;
  module: BusinessModule;
  title: string;
  applicantId: string;
  departmentId: string;
  /** 业务模块在草稿阶段已经生成的单据编号，提交时不再另行编号。 */
  documentNo?: string | null;
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
    await this.rebindUntouchedDocuments();
  }

  /**
   * 流程链路调整后，把尚未开始的单据绑定到最新发布版本：
   * - 草稿/未提交单据直接切换流程版本；
   * - 审批中但尚无任何已办节点的单据，取消旧待办并从新链路首节点重新开始。
   * 已有审批记录的在途单据保持原版本，保证历史可重放。
   */
  private async rebindUntouchedDocuments(): Promise<void> {
    const documents = await this.documents.find({
      where: { status: In(['DRAFT', 'IN_REVIEW']) },
    });
    for (const document of documents) {
      const published = await this.processDesign.findPublishedByDocumentType(document.documentType);
      if (!published || published.version.id === document.processVersionId) continue;

      if (document.status === 'DRAFT') {
        document.processVersionId = published.version.id;
        document.workflowCode = published.definition.code;
        await this.documents.save(document);
        continue;
      }

      try {
        await this.dataSource.transaction(async (manager) => {
          const repository = manager.getRepository(DocumentIndexEntity);
          const current = await repository.findOneBy({ id: document.id });
          if (!current || current.status !== 'IN_REVIEW') return;
          const taskRepository = manager.getRepository(WorkflowTaskEntity);
          const completed = await taskRepository.count({
            where: { documentId: current.id, status: 'COMPLETED' },
          });
          // 已有审批结论的在途单据不能中途换链
          if (completed > 0) return;
          const pending = await taskRepository.find({
            where: { documentId: current.id, status: 'PENDING' },
          });
          if (pending.length === 0) return;
          for (const task of pending) {
            task.status = 'CANCELLED';
            task.completedBy = null;
          }
          await taskRepository.save(pending);

          current.processVersionId = published.version.id;
          current.workflowCode = published.definition.code;
          const definition = await this.loadRuntimeDefinition(current);
          const placement = await this.createPendingTaskSkippingUnresolved(
            manager,
            current,
            definition,
            0,
          );
          if (!placement) {
            // 新链路暂时无人可办：回滚，保持旧链路可继续流转
            throw new DomainError('WORKFLOW_REBIND_NO_CANDIDATE', '最新流程暂时没有可办理人');
          }
          current.currentStep = placement.stepIndex;
          current.revision += 1;
          await repository.save(current);
          this.logger.log(
            `单据 ${current.id} 已切换到最新流程 ${definition.code} V${definition.version}`,
          );
        });
      } catch (error) {
        this.logger.warn(
          `单据 ${document.id} 保持原流程版本：${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }

  async registerDraft(input: RegisterDraftInput): Promise<DocumentIndexEntity> {
    const [form, process] = await Promise.all([
      this.formDesign.findPublishedByDocumentType(input.documentType),
      this.processDesign.findPublishedByDocumentType(input.documentType),
    ]);
    const legacy = process ? null : await this.findDefinition(input.documentType);
    return this.documents.save({
      ...input,
      documentNo: input.documentNo ?? null,
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
      const placement = await this.createPendingTaskSkippingUnresolved(
        manager,
        document,
        definition,
        0,
      );
      if (!placement) {
        const firstNode = definition.tasks[0];
        throw new DomainError('WORKFLOW_ASSIGNEE_EMPTY', '审批节点未解析到有效办理人', {
          processNodeId: firstNode?.id,
          processNodeName: firstNode?.name,
        });
      }
      const prefix = this.documentNumbers.documentNumberPrefix(
        document.documentType as DocumentType,
      );
      const documentNo =
        document.documentNo ??
        (prefix ? await this.documentNumbers.generate(manager, prefix) : null);
      const submitted = await documentRepository.update(
        { id: document.id, status: document.status, revision: document.revision },
        {
          status: 'IN_REVIEW',
          currentStep: placement.stepIndex,
          revision: document.revision + 1,
          documentNo,
        },
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
    choices: string[] = [],
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
      // 请示批复的办公室节点必须先勾选下一步审核部门，不能直接跳过部门审核；
      // 分支任务与选择节点共用 stepIndex，不能按选择节点校验
      if (
        !task.originTaskId &&
        action === 'APPROVE' &&
        node?.kind === 'CHOICE' &&
        node.advanceAfterBranches &&
        choices.length === 0
      ) {
        throw new DomainError('WORKFLOW_CHOICE_REQUIRED', '请选择下一步审核部门后再提交', {
          processNodeId: node.id,
          processNodeName: node.name,
        });
      }
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

      if (task.originTaskId) {
        if (action === 'RETURN') {
          // 分支审核人退回：回到「人工选择」节点，由指派方重新决定后续审核。
          await this.returnBranchTask(manager, document, definition, task);
        } else {
          // 分支任务（外部律师 / 兄弟部门）：办结后回到「人工选择」节点，由行政审批人继续决定去向。
          await this.settleBranchTask(manager, document, definition, task);
        }
      } else if (action === 'RETURN') {
        await this.returnToPreviousStep(manager, document, definition, task);
      } else if (node?.kind === 'CHOICE' && choices.length > 0) {
        await this.dispatchBranches(manager, document, task, node, choices);
      } else {
        const placement = await this.createPendingTaskSkippingUnresolved(
          manager,
          document,
          definition,
          task.stepIndex + 1,
        );
        if (!placement) {
          document.status = 'APPROVED';
          document.currentStep = null;
        } else {
          document.currentStep = placement.stepIndex;
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
        ? toTaskSummary(
            currentTask,
            document,
            currentNode?.name ?? null,
            currentNode?.options ?? [],
          )
        : null,
      pendingBranches: await this.readBranchSummaries(documentId),
      opinions: await this.readOpinions(documentId),
    };
  }

  /** 「人工选择下一步」派发出的分支任务清单，供审批界面显示进度。 */
  private async readBranchSummaries(documentId: string): Promise<WorkflowBranchSummary[]> {
    const branches = await this.tasks.find({
      where: { documentId },
      order: { createdAt: 'ASC' },
    });
    const scoped = branches.filter((task) => task.originTaskId);
    if (scoped.length === 0) return [];
    const completedByIds = [
      ...new Set(scoped.map((task) => task.completedBy).filter((id): id is string => Boolean(id))),
    ];
    const names = new Map(
      (completedByIds.length > 0 ? await this.iam.listUsers() : [])
        .filter((user) => completedByIds.includes(user.id))
        .map((user) => [user.id, user.displayName]),
    );
    return scoped.map((task) => ({
      taskId: task.id,
      label: task.branchLabel ?? '分支审核',
      status: task.status === 'PENDING' ? 'PENDING' : 'COMPLETED',
      completedByName: task.completedBy ? (names.get(task.completedBy) ?? null) : null,
    }));
  }

  async getDocument(documentId: string): Promise<DocumentIndexEntity> {
    const document = await this.documents.findOneBy({ id: documentId });
    if (!document) throw new NotFoundException('单据不存在');
    return document;
  }

  /** 校验用户是当前待审节点的固化办理人，返回该待办（用于审批人改单等节点内操作）。 */
  async getModeratableTask(documentId: string, user: SessionUser): Promise<WorkflowTaskEntity> {
    await this.getDocument(documentId);
    const pending = await this.tasks.find({
      where: { documentId, status: 'PENDING' },
      order: { createdAt: 'DESC' },
    });
    for (const task of pending) {
      if (await this.candidates.existsBy({ taskId: task.id, userId: user.id })) return task;
    }
    if (pending.length === 0) {
      throw new DomainError('WORKFLOW_NOT_IN_REVIEW', '单据不在审批流转中');
    }
    throw new ForbiddenException('当前用户不是该单据当前审批节点的办理人');
  }

  /** 校验用户是当前待审节点的固化办理人，返回单据（用于审批人改单等节点内操作）。 */
  async getModeratableDocument(
    documentId: string,
    user: SessionUser,
  ): Promise<DocumentIndexEntity> {
    await this.getModeratableTask(documentId, user);
    return this.getDocument(documentId);
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

  /**
   * 从 startIndex 起寻找第一个能产生待办的节点：
   * 无法解析出任何候选人的节点自动跳过（申请人本人即负责人、部门未配置负责人等），
   * 候选人都缺少审批权限的节点仍按配置错误处理，避免静默绕过审批。
   */
  private async createPendingTaskSkippingUnresolved(
    manager: EntityManager,
    document: DocumentIndexEntity,
    definition: RuntimeWorkflowDefinition,
    startIndex: number,
  ): Promise<{ task: WorkflowTaskEntity; stepIndex: number } | null> {
    for (let stepIndex = startIndex; stepIndex < definition.tasks.length; stepIndex += 1) {
      const node = definition.tasks[stepIndex];
      if (!node) continue;
      const resolution = await this.resolveNodeCandidates(document, node);
      if (resolution.resolvedCount === 0) {
        this.logger.warn(
          `跳过无有效办理人的审批节点：单据 ${document.id} 节点「${node.name}」(${node.id})`,
        );
        continue;
      }
      const task = await this.insertPendingTask(manager, document, stepIndex, node, resolution);
      return { task, stepIndex };
    }
    return null;
  }

  private resolveNodeCandidates(
    document: DocumentIndexEntity,
    node: RuntimeWorkflowTask,
  ): Promise<ApprovalCandidateResolution> {
    return this.candidateService.resolve(
      node.assigneeRule,
      document.departmentId,
      document.applicantId,
      requiredBusinessModulePermissions(document.module, 'VIEW'),
    );
  }

  private async createPendingTask(
    manager: EntityManager,
    document: DocumentIndexEntity,
    stepIndex: number,
    node: RuntimeWorkflowTask | undefined,
    branch?: { originTaskId: string; branchLabel: string; nodeKind: 'APPROVAL' | 'CHOICE' },
  ): Promise<WorkflowTaskEntity> {
    if (!node) throw new DomainError('WORKFLOW_STEP_MISSING', '审批流程缺少办理节点');
    const resolution = await this.resolveNodeCandidates(document, node);
    if (resolution.resolvedCount === 0) {
      throw new DomainError('WORKFLOW_ASSIGNEE_EMPTY', '审批节点未解析到有效办理人', {
        processNodeId: node.id,
        processNodeName: node.name,
      });
    }
    return this.insertPendingTask(manager, document, stepIndex, node, resolution, branch);
  }

  private async insertPendingTask(
    manager: EntityManager,
    document: DocumentIndexEntity,
    stepIndex: number,
    node: RuntimeWorkflowTask,
    resolution: ApprovalCandidateResolution,
    branch?: { originTaskId: string; branchLabel: string; nodeKind: 'APPROVAL' | 'CHOICE' },
  ): Promise<WorkflowTaskEntity> {
    if (resolution.candidates.length === 0) {
      throw new DomainError(
        'WORKFLOW_ASSIGNEE_PERMISSION_MISSING',
        '审批节点候选人缺少审批或业务查看权限',
        {
          processNodeId: node.id,
          processNodeName: node.name,
          requiredPermission: 'WORKFLOW_APPROVE',
          requiredPermissions: [
            'WORKFLOW_APPROVE',
            ...requiredBusinessModulePermissions(document.module, 'VIEW'),
          ],
          resolvedCandidateCount: resolution.resolvedCount,
        },
      );
    }
    const assigneeColumns = taskAssigneeColumns(node.assigneeRule);
    if (resolution.assigneeValue) {
      assigneeColumns.assigneeValue = resolution.assigneeValue;
    }
    const task = await manager.getRepository(WorkflowTaskEntity).save({
      id: randomUUID(),
      documentId: document.id,
      stepIndex,
      processNodeId: node.id,
      nodeKind: branch?.nodeKind ?? node.kind,
      originTaskId: branch?.originTaskId ?? null,
      branchLabel: branch?.branchLabel ?? null,
      ...assigneeColumns,
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

  /**
   * 「人工选择下一步」：行政审批人勾选审核方后派发分支任务，全部办结后自动回到本节点。
   */
  private async dispatchBranches(
    manager: EntityManager,
    document: DocumentIndexEntity,
    task: WorkflowTaskEntity,
    node: RuntimeWorkflowTask,
    choices: string[],
  ): Promise<void> {
    const selected = node.options.filter((option) => choices.includes(option.id));
    if (selected.length === 0) {
      throw new DomainError('WORKFLOW_CHOICE_INVALID', '请选择至少一个后续审核方');
    }
    const openBranches = await manager.getRepository(WorkflowTaskEntity).find({
      where: { originTaskId: task.id, status: 'PENDING' },
    });
    const openOptionIds = new Set(openBranches.map((branch) => branch.processNodeId));
    const newOptions = selected.filter((option) => !openOptionIds.has(option.id));
    if (newOptions.length === 0) {
      throw new DomainError('WORKFLOW_CHOICE_DUPLICATED', '所选审核方已在办理中');
    }
    for (const option of newOptions) {
      await this.createPendingTask(
        manager,
        document,
        task.stepIndex,
        {
          id: option.id,
          name: option.name,
          kind: 'APPROVAL',
          assigneeRule: option.assigneeRule,
          options: [],
        },
        { originTaskId: task.id, branchLabel: option.name, nodeKind: 'APPROVAL' },
      );
    }
    document.status = 'IN_REVIEW';
    document.currentStep = task.stepIndex;
  }

  /** 分支任务办结：等待同一节点派出的其它分支，全部办结后回到选择节点。 */
  private async settleBranchTask(
    manager: EntityManager,
    document: DocumentIndexEntity,
    definition: RuntimeWorkflowDefinition,
    task: WorkflowTaskEntity,
  ): Promise<void> {
    const branchRepository = manager.getRepository(WorkflowTaskEntity);
    const openBranches = await branchRepository.count({
      where: { originTaskId: task.originTaskId ?? '', status: 'PENDING' },
    });
    if (openBranches > 0) {
      document.status = 'IN_REVIEW';
      return;
    }
    const originTask = task.originTaskId
      ? await branchRepository.findOneBy({ id: task.originTaskId })
      : null;
    const chooserStep = originTask?.stepIndex ?? task.stepIndex;
    const chooserNode = definition.tasks[chooserStep];
    if (!chooserNode) {
      document.status = 'APPROVED';
      document.currentStep = null;
      return;
    }
    const pendingChooser = await branchRepository.findOne({
      where: {
        documentId: document.id,
        stepIndex: chooserStep,
        status: 'PENDING',
        originTaskId: IsNull(),
      },
    });
    if (pendingChooser) {
      // 已有分支退回并重新打开了选择节点，其他分支办结时不再重复派生待办。
      document.status = 'IN_REVIEW';
      document.currentStep = chooserStep;
      return;
    }
    if (chooserNode.advanceAfterBranches) {
      // 请示批复：办公室选定部门审核后直接送主管领导，不再回到办公室确认。
      const placement = await this.createPendingTaskSkippingUnresolved(
        manager,
        document,
        definition,
        chooserStep + 1,
      );
      if (!placement) {
        document.status = 'APPROVED';
        document.currentStep = null;
      } else {
        document.status = 'IN_REVIEW';
        document.currentStep = placement.stepIndex;
      }
      return;
    }
    await this.createPendingTask(manager, document, chooserStep, chooserNode);
    document.status = 'IN_REVIEW';
    document.currentStep = chooserStep;
  }

  /**
   * 普通审批节点退回：退回最近的、仍能解析出办理人的前置审批节点；
   * 第一个审批节点退回发起人（单据回到可编辑状态）。
   */
  private async returnToPreviousStep(
    manager: EntityManager,
    document: DocumentIndexEntity,
    definition: RuntimeWorkflowDefinition,
    task: WorkflowTaskEntity,
  ): Promise<void> {
    const taskRepository = manager.getRepository(WorkflowTaskEntity);
    for (let targetStep = task.stepIndex - 1; targetStep >= 0; targetStep -= 1) {
      const targetNode = definition.tasks[targetStep];
      if (!targetNode) continue;
      const existing = await taskRepository.findOne({
        where: {
          documentId: document.id,
          stepIndex: targetStep,
          status: 'PENDING',
          originTaskId: IsNull(),
        },
      });
      if (existing) {
        document.status = 'IN_REVIEW';
        document.currentStep = targetStep;
        return;
      }
      try {
        await this.createPendingTask(manager, document, targetStep, targetNode);
        document.status = 'IN_REVIEW';
        document.currentStep = targetStep;
        return;
      } catch (error) {
        if (!this.isAssigneeUnavailable(error)) throw error;
      }
    }
    document.status = 'RETURNED';
    document.currentStep = null;
  }

  /** 分支任务退回：重新打开「人工选择」节点，由指派方决定重新选择或继续退回。 */
  private async returnBranchTask(
    manager: EntityManager,
    document: DocumentIndexEntity,
    definition: RuntimeWorkflowDefinition,
    task: WorkflowTaskEntity,
  ): Promise<void> {
    const taskRepository = manager.getRepository(WorkflowTaskEntity);
    const originTask = task.originTaskId
      ? await taskRepository.findOneBy({ id: task.originTaskId })
      : null;
    const chooserStep = originTask?.stepIndex ?? task.stepIndex;
    const chooserNode = definition.tasks[chooserStep];
    if (!chooserNode) {
      document.status = 'RETURNED';
      document.currentStep = null;
      return;
    }
    const existing = await taskRepository.findOne({
      where: {
        documentId: document.id,
        stepIndex: chooserStep,
        status: 'PENDING',
        originTaskId: IsNull(),
      },
    });
    if (existing) {
      document.status = 'IN_REVIEW';
      document.currentStep = chooserStep;
      return;
    }
    try {
      await this.createPendingTask(manager, document, chooserStep, chooserNode);
      document.status = 'IN_REVIEW';
      document.currentStep = chooserStep;
    } catch (error) {
      if (!this.isAssigneeUnavailable(error)) throw error;
      document.status = 'RETURNED';
      document.currentStep = null;
    }
  }

  /** 前置节点没有可用办理人（负责人未配置、本人审批本人等）时允许退回发起人。 */
  private isAssigneeUnavailable(error: unknown): boolean {
    return (
      error instanceof DomainError &&
      (error.code === 'WORKFLOW_ASSIGNEE_EMPTY' ||
        error.code === 'WORKFLOW_ASSIGNEE_PERMISSION_MISSING')
    );
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
        const node = definition.tasks[task.stepIndex];
        return toTaskSummary(task, document, node?.name ?? null, node?.options ?? []);
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
