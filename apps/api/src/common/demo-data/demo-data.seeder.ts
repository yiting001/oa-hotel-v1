import type { SessionUser } from '@oa/contracts';
import type { DataSource, Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { DocumentWorkflowService } from '../workflow/application/document-workflow.service';
import { WorkflowCopyService } from '../workflow/application/workflow-copy.service';
import { stableWorkflowRequestId } from '../workflow/application/workflow-request-id';
import { DocumentFollowService } from '../workbench/application/document-follow.service';
import { DocumentIndexEntity } from '../workflow/infrastructure/document-index.entity';
import { WorkflowTaskCandidateEntity } from '../workflow/infrastructure/workflow-task-candidate.entity';
import { WorkflowTaskEntity } from '../workflow/infrastructure/workflow-task.entity';
import { ContractApplicationService } from '../../modules/contract/application/contract-application.service';
import { SealApplicationService } from '../../modules/seal/application/seal-application.service';
import { MaterialItemEntity } from '../../modules/supply/infrastructure/material-item.entity';
import { SupplyApplicationService } from '../../modules/supply/application/supply-application.service';
import {
  DEMO_APPLICANT_USER_ID,
  DEMO_MATERIAL_ITEM,
  DEMO_SCENARIOS,
  type DemoScenario,
  type DemoScenarioTarget,
} from './demo-data.catalog';

interface DemoSeedEnvironment {
  [key: string]: string | undefined;
  NODE_ENV?: string;
  OA_DEMO_SEED?: string;
}

export interface DemoSeedScenarioResult {
  key: string;
  documentId: string;
  title: string;
  created: boolean;
  status: string;
  currentStep: number | null;
}

export interface DemoSeedSummary {
  created: number;
  reused: number;
  scenarios: DemoSeedScenarioResult[];
  interactions: { follows: number; copies: number };
}

/** Rejects accidental execution from application startup or a production deployment. */
export function assertDemoDataSeedAllowed(environment: DemoSeedEnvironment): void {
  if (environment.NODE_ENV?.trim().toLowerCase() === 'production') {
    throw new Error('演示数据初始化禁止在 production 环境执行');
  }
  if (environment.OA_DEMO_SEED?.trim().toLowerCase() !== 'true') {
    throw new Error('演示数据初始化必须显式设置 OA_DEMO_SEED=true');
  }
}

/** Creates local demo documents through the same application services used by HTTP commands. */
export class DemoDataSeeder {
  private readonly documents: Repository<DocumentIndexEntity>;
  private readonly tasks: Repository<WorkflowTaskEntity>;
  private readonly candidates: Repository<WorkflowTaskCandidateEntity>;
  private readonly materialItems: Repository<MaterialItemEntity>;

  constructor(
    dataSource: DataSource,
    private readonly auth: AuthService,
    private readonly workflow: DocumentWorkflowService,
    private readonly contracts: ContractApplicationService,
    private readonly seals: SealApplicationService,
    private readonly supplies: SupplyApplicationService,
    private readonly follows: DocumentFollowService,
    private readonly copies: WorkflowCopyService,
  ) {
    this.documents = dataSource.getRepository(DocumentIndexEntity);
    this.tasks = dataSource.getRepository(WorkflowTaskEntity);
    this.candidates = dataSource.getRepository(WorkflowTaskCandidateEntity);
    this.materialItems = dataSource.getRepository(MaterialItemEntity);
  }

  async seed(environment: DemoSeedEnvironment = process.env): Promise<DemoSeedSummary> {
    assertDemoDataSeedAllowed(environment);
    await this.ensureReferenceData();
    const applicant = await this.auth.getSessionUser(DEMO_APPLICANT_USER_ID);
    const results: DemoSeedScenarioResult[] = [];
    const documentIdsByKey = new Map<string, string>();

    for (const scenario of DEMO_SCENARIOS) {
      const existing = await this.findScenarioDocument(scenario, applicant);
      const documentId =
        existing?.id ?? (await this.createScenario(scenario, applicant, documentIdsByKey));
      documentIdsByKey.set(scenario.key, documentId);
      const document = await this.advanceToTarget(documentId, scenario.key, scenario.target);
      results.push({
        key: scenario.key,
        documentId,
        title: document.title,
        created: !existing,
        status: document.status,
        currentStep: document.currentStep,
      });
    }

    const interactions = await this.seedInteractions(results, applicant);
    return {
      created: results.filter((result) => result.created).length,
      reused: results.filter((result) => !result.created).length,
      scenarios: results,
      interactions,
    };
  }

  private async ensureReferenceData(): Promise<void> {
    if (!(await this.materialItems.existsBy({ id: DEMO_MATERIAL_ITEM.id }))) {
      await this.materialItems.insert(DEMO_MATERIAL_ITEM);
    }
  }

  private findScenarioDocument(
    scenario: DemoScenario,
    applicant: SessionUser,
  ): Promise<DocumentIndexEntity | null> {
    return this.documents.findOne({
      where: { title: scenario.title, applicantId: applicant.id },
      order: { createdAt: 'DESC' },
    });
  }

  private async createScenario(
    scenario: DemoScenario,
    applicant: SessionUser,
    documentIdsByKey: Map<string, string>,
  ): Promise<string> {
    switch (scenario.kind) {
      case 'CONTRACT_REQUEST':
        return (await this.contracts.saveRequest(scenario.payload, applicant)).data.id;
      case 'CONTRACT_APPROVAL':
        return (await this.contracts.saveContract(scenario.payload, applicant)).data.id;
      case 'CONTRACT_PAYMENT':
        return (
          await this.contracts.savePayment(
            {
              ...scenario.payload,
              contractId: requiredDocumentId(documentIdsByKey, scenario.contractScenarioKey),
            },
            applicant,
          )
        ).data.id;
      case 'SEAL_USE':
        return (await this.seals.saveUse(scenario.payload, applicant)).data.id;
      case 'SEAL_BORROW':
        return (await this.seals.saveBorrow(scenario.payload, applicant)).data.id;
      case 'MATERIAL_PURCHASE':
        return (await this.supplies.savePurchase(scenario.payload, applicant)).data.id;
      case 'MATERIAL_REQUISITION':
        return (await this.supplies.saveRequisition(scenario.payload, applicant)).data.id;
    }
  }

  private async advanceToTarget(
    documentId: string,
    scenarioKey: string,
    target: DemoScenarioTarget,
  ): Promise<DocumentIndexEntity> {
    let document = await this.workflow.getDocument(documentId);
    if (target.status === 'DRAFT') return document;

    if (document.status === 'DRAFT' || document.status === 'RETURNED') {
      const applicant = await this.auth.getSessionUser(document.applicantId);
      document = await this.workflow.submit(
        document.id,
        stableWorkflowRequestId(`${scenarioKey}:submit:${document.revision}`),
        applicant,
      );
    }

    while (document.status === 'IN_REVIEW') {
      if (
        target.status === 'IN_REVIEW' &&
        document.currentStep !== null &&
        document.currentStep >= target.currentStep
      ) {
        return document;
      }
      const task = await this.tasks.findOne({
        where: { documentId, status: 'PENDING' },
        order: { createdAt: 'DESC' },
      });
      if (!task) throw new Error(`演示单据 ${scenarioKey} 缺少当前待办`);
      const candidate = await this.candidates.findOne({
        where: { taskId: task.id },
        order: { userId: 'ASC' },
      });
      if (!candidate) throw new Error(`演示单据 ${scenarioKey} 的待办缺少候选人`);
      const approver = await this.auth.getSessionUser(candidate.userId);
      document = await this.workflow.completeTask(
        task.id,
        stableWorkflowRequestId(`${scenarioKey}:approve:${task.id}`),
        '演示数据初始化：资料完整，同意办理。',
        'APPROVE',
        approver,
      );
    }

    return document;
  }

  private async seedInteractions(
    results: DemoSeedScenarioResult[],
    applicant: SessionUser,
  ): Promise<{ follows: number; copies: number }> {
    const documentIdByKey = new Map(results.map((result) => [result.key, result.documentId]));
    const approvedContractId = requiredDocumentId(documentIdByKey, 'contract-approval-approved');
    const officeSealTaskId = requiredDocumentId(documentIdByKey, 'seal-use-office-todo');
    const office = await this.auth.getSessionUser('user-office');

    await Promise.all([
      this.follows.follow(approvedContractId, applicant),
      this.follows.follow(officeSealTaskId, office),
    ]);
    const copyResult = await this.copies.copyDocument(
      approvedContractId,
      ['user-office', 'user-finance'],
      applicant,
    );
    const officeCopy = copyResult.deliveries.find((delivery) => delivery.recipientId === office.id);
    if (!officeCopy) throw new Error('演示抄送缺少办公室接收记录');
    await this.copies.markRead(officeCopy.id, office);
    return { follows: 2, copies: copyResult.deliveries.length };
  }
}

function requiredDocumentId(documentIds: Map<string, string>, key: string): string {
  const documentId = documentIds.get(key);
  if (!documentId) throw new Error(`演示场景 ${key} 未生成单据`);
  return documentId;
}
