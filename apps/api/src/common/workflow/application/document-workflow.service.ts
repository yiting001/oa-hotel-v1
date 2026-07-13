import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import type {
  ApprovalOpinion,
  ApprovalTaskSummary,
  BusinessModule,
  DocumentType,
  SessionUser,
} from '@oa/contracts';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, In, Repository } from 'typeorm';
import { DomainError } from '../../errors/domain-error';
import { DocumentIndexEntity } from '../infrastructure/document-index.entity';
import { WorkflowCommandEntity } from '../infrastructure/workflow-command.entity';
import { WorkflowDefinitionEntity } from '../infrastructure/workflow-definition.entity';
import { WorkflowOpinionEntity } from '../infrastructure/workflow-opinion.entity';
import { WorkflowTaskEntity } from '../infrastructure/workflow-task.entity';

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
  constructor(
    @InjectRepository(DocumentIndexEntity)
    private readonly documents: Repository<DocumentIndexEntity>,
    @InjectRepository(WorkflowDefinitionEntity)
    private readonly definitions: Repository<WorkflowDefinitionEntity>,
    @InjectRepository(WorkflowTaskEntity)
    private readonly tasks: Repository<WorkflowTaskEntity>,
    @InjectRepository(WorkflowOpinionEntity)
    private readonly opinions: Repository<WorkflowOpinionEntity>,
    @Inject(DataSource)
    private readonly dataSource: DataSource,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.NODE_ENV === 'production' || (await this.definitions.count()) > 0) {
      return;
    }
    await this.definitions.save([
      this.definition('contract-request', 'CONTRACT_REQUEST', '合同/支出请示', [
        'DEPARTMENT_MANAGER',
        'FINANCE_REVIEWER',
      ]),
      this.definition('contract-approval', 'CONTRACT_APPROVAL', '合同审批', [
        'DEPARTMENT_MANAGER',
        'FINANCE_REVIEWER',
        'OFFICE_REVIEWER',
      ]),
      this.definition('contract-payment', 'CONTRACT_PAYMENT', '合同付款', [
        'DEPARTMENT_MANAGER',
        'FINANCE_REVIEWER',
      ]),
      this.definition('seal-borrow', 'SEAL_BORROW', '印章证照外借', [
        'DEPARTMENT_MANAGER',
        'OFFICE_REVIEWER',
        'SEAL_MANAGER',
      ]),
      this.definition('seal-use', 'SEAL_USE', '印章证照使用', [
        'DEPARTMENT_MANAGER',
        'OFFICE_REVIEWER',
        'SEAL_MANAGER',
      ]),
      this.definition('material-purchase', 'MATERIAL_PURCHASE', '物资申购', [
        'DEPARTMENT_MANAGER',
        'PROCUREMENT',
        'FINANCE_REVIEWER',
      ]),
      this.definition('material-requisition', 'MATERIAL_REQUISITION', '物资领用', [
        'DEPARTMENT_MANAGER',
        'WAREHOUSE_MANAGER',
      ]),
    ]);
  }

  async registerDraft(input: RegisterDraftInput): Promise<DocumentIndexEntity> {
    const definition = await this.findDefinition(input.documentType);
    return this.documents.save({
      ...input,
      status: 'DRAFT',
      revision: 1,
      currentStep: null,
      workflowCode: definition.code,
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
      const commands = manager.getRepository(WorkflowCommandEntity);
      const existing = await commands.findOneBy({ requestId, documentId });
      if (existing) {
        return manager.getRepository(DocumentIndexEntity).findOneByOrFail({ id: documentId });
      }

      const document = await manager
        .getRepository(DocumentIndexEntity)
        .findOneBy({ id: documentId });
      if (!document) {
        throw new NotFoundException('单据不存在');
      }
      if (document.applicantId !== user.id) {
        throw new ForbiddenException('只能提交本人发起的单据');
      }
      if (!['DRAFT', 'RETURNED'].includes(document.status)) {
        throw new DomainError('DOCUMENT_NOT_SUBMITTABLE', '当前状态不允许提交');
      }
      const definition = await manager
        .getRepository(WorkflowDefinitionEntity)
        .findOneByOrFail({ code: document.workflowCode, active: true });
      document.status = 'IN_REVIEW';
      document.currentStep = 0;
      document.revision += 1;
      await manager.getRepository(DocumentIndexEntity).save(document);
      await manager.getRepository(WorkflowTaskEntity).save({
        id: randomUUID(),
        documentId,
        stepIndex: 0,
        assigneeRole: definition.steps[0],
        status: 'PENDING',
        completedBy: null,
      });
      await this.recordOpinion(manager.getRepository(WorkflowOpinionEntity), {
        documentId,
        taskId: '',
        actor: user,
        action: 'SUBMIT',
        comment: '提交审批',
      });
      await commands.save({ requestId, documentId });
      return document;
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
      const commandRepository = manager.getRepository(WorkflowCommandEntity);
      const task = await taskRepository.findOneBy({ id: taskId });
      if (!task) {
        throw new NotFoundException('待办不存在');
      }
      const duplicate = await commandRepository.findOneBy({
        requestId,
        documentId: task.documentId,
      });
      if (duplicate) {
        return manager.getRepository(DocumentIndexEntity).findOneByOrFail({ id: task.documentId });
      }
      if (task.status !== 'PENDING') {
        throw new DomainError('TASK_ALREADY_COMPLETED', '该待办已被处理');
      }
      if (!user.roleCodes.includes(task.assigneeRole)) {
        throw new ForbiddenException('当前用户不能处理该待办');
      }

      const documentRepository = manager.getRepository(DocumentIndexEntity);
      const document = await documentRepository.findOneByOrFail({ id: task.documentId });
      task.status = 'COMPLETED';
      task.completedBy = user.id;
      await taskRepository.save(task);
      await this.recordOpinion(manager.getRepository(WorkflowOpinionEntity), {
        documentId: document.id,
        taskId: task.id,
        actor: user,
        action,
        comment,
      });

      if (action === 'RETURN') {
        document.status = 'RETURNED';
        document.currentStep = null;
      } else {
        const definition = await manager
          .getRepository(WorkflowDefinitionEntity)
          .findOneByOrFail({ code: document.workflowCode });
        const nextStep = task.stepIndex + 1;
        if (nextStep >= definition.steps.length) {
          document.status = 'APPROVED';
          document.currentStep = null;
        } else {
          document.currentStep = nextStep;
          await taskRepository.save({
            id: randomUUID(),
            documentId: document.id,
            stepIndex: nextStep,
            assigneeRole: definition.steps[nextStep],
            status: 'PENDING',
            completedBy: null,
          });
        }
      }
      document.revision += 1;
      await documentRepository.save(document);
      await commandRepository.save({ requestId, documentId: document.id });
      return document;
    });
  }

  async listTasks(user: SessionUser): Promise<ApprovalTaskSummary[]> {
    if (user.roleCodes.length === 0) {
      return [];
    }
    const tasks = await this.tasks.find({
      where: {
        assigneeRole: In(user.roleCodes),
        status: 'PENDING',
      },
      order: { createdAt: 'DESC' },
    });
    const documents = await this.documents.findBy({ id: In(tasks.map((task) => task.documentId)) });
    const documentMap = new Map(documents.map((document) => [document.id, document]));
    return tasks.map((task) => {
      const document = documentMap.get(task.documentId);
      if (!document) {
        throw new DomainError('DOCUMENT_INDEX_MISSING', '待办关联单据不存在');
      }
      return {
        id: task.id,
        documentId: task.documentId,
        documentType: document.documentType as DocumentType,
        documentTitle: document.title,
        currentStep: task.stepIndex,
        assigneeRole: task.assigneeRole,
        status: task.status as ApprovalTaskSummary['status'],
        createdAt: task.createdAt.toISOString(),
      };
    });
  }

  async listMyDocuments(user: SessionUser): Promise<DocumentIndexEntity[]> {
    return this.documents.find({
      where: { applicantId: user.id },
      order: { updatedAt: 'DESC' },
    });
  }

  async history(documentId: string): Promise<ApprovalOpinion[]> {
    const opinions = await this.opinions.find({
      where: { documentId },
      order: { createdAt: 'ASC' },
    });
    return opinions.map((opinion) => ({
      id: opinion.id,
      action: opinion.action as ApprovalOpinion['action'],
      comment: opinion.comment,
      actorName: opinion.actorName,
      createdAt: opinion.createdAt.toISOString(),
    }));
  }

  async getDocument(documentId: string): Promise<DocumentIndexEntity> {
    const document = await this.documents.findOneBy({ id: documentId });
    if (!document) {
      throw new NotFoundException('单据不存在');
    }
    return document;
  }

  private definition(
    code: string,
    documentType: DocumentType,
    name: string,
    steps: string[],
  ): WorkflowDefinitionEntity {
    return {
      code,
      documentType,
      name,
      steps,
      version: 1,
      active: true,
    };
  }

  private async findDefinition(documentType: DocumentType): Promise<WorkflowDefinitionEntity> {
    const definition = await this.definitions.findOneBy({ documentType, active: true });
    if (!definition) {
      throw new DomainError('WORKFLOW_NOT_CONFIGURED', '该单据未配置审批流程');
    }
    return definition;
  }

  private async recordOpinion(
    repository: Repository<WorkflowOpinionEntity>,
    input: {
      documentId: string;
      taskId: string;
      actor: SessionUser;
      action: 'SUBMIT' | 'APPROVE' | 'RETURN';
      comment: string;
    },
  ): Promise<void> {
    await repository.save({
      id: randomUUID(),
      documentId: input.documentId,
      taskId: input.taskId,
      actorId: input.actor.id,
      actorName: input.actor.displayName,
      action: input.action,
      comment: input.comment,
    });
  }
}
