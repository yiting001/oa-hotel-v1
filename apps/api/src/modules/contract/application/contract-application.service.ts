import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { randomUUID } from 'node:crypto';
import { createDocumentNumber } from '../../../common/domain/document-number';
import { DocumentWorkflowService } from '../../../common/workflow/application/document-workflow.service';
import { calculateContractPayment } from '../domain/contract-payment';
import { CONTRACT_REPOSITORY, type ContractRepository } from '../domain/contract.repository';
import type {
  ContractApprovalDto,
  ContractPaymentDto,
  ContractRequestDto,
} from '../presentation/contract.dto';

@Injectable()
export class ContractApplicationService {
  constructor(
    @Inject(CONTRACT_REPOSITORY)
    private readonly repository: ContractRepository,
    @Inject(DocumentWorkflowService)
    private readonly workflow: DocumentWorkflowService,
  ) {}

  async saveRequest(dto: ContractRequestDto, user: SessionUser, id?: string) {
    if (id) {
      await this.workflow.getEditable(id, user);
      const current = await this.repository.findRequest(id);
      if (!current) {
        throw new NotFoundException('请示单不存在');
      }
      const saved = await this.repository.saveRequest({ ...current, ...dto });
      await this.workflow.updateDraftTitle(id, dto.title, user);
      return this.withIndex(saved);
    }
    const documentId = randomUUID();
    const saved = await this.repository.saveRequest({
      id: documentId,
      number: createDocumentNumber('CONTRACT-REQUEST', documentId),
      departmentId: user.departmentId,
      applicantId: user.id,
      ...dto,
    });
    await this.workflow.registerDraft({
      id: documentId,
      documentType: 'CONTRACT_REQUEST',
      module: 'CONTRACT',
      title: dto.title,
      applicantId: user.id,
      departmentId: user.departmentId,
    });
    return this.withIndex(saved);
  }

  async saveContract(dto: ContractApprovalDto, user: SessionUser, id?: string) {
    if (id) {
      await this.workflow.getEditable(id, user);
      const current = await this.repository.findContract(id);
      if (!current) {
        throw new NotFoundException('合同审批单不存在');
      }
      const saved = await this.repository.saveContract({ ...current, ...dto });
      await this.workflow.updateDraftTitle(id, dto.name, user);
      return this.withIndex(saved);
    }
    const documentId = randomUUID();
    const saved = await this.repository.saveContract({
      id: documentId,
      number: createDocumentNumber('CONTRACT', documentId),
      applicantId: user.id,
      ...dto,
    });
    await this.workflow.registerDraft({
      id: documentId,
      documentType: 'CONTRACT_APPROVAL',
      module: 'CONTRACT',
      title: dto.name,
      applicantId: user.id,
      departmentId: dto.signingDepartmentId,
    });
    return this.withIndex(saved);
  }

  async savePayment(dto: ContractPaymentDto, user: SessionUser, id?: string) {
    const contract = await this.repository.findContract(dto.contractId);
    if (!contract) {
      throw new NotFoundException('关联合同不存在');
    }
    const calculation = calculateContractPayment(dto);
    const fields = {
      ...dto,
      applicantId: user.id,
      departmentId: user.departmentId,
      remainingAmountCents: calculation.remainingAmountCents,
      paymentAmountUppercase: calculation.paymentAmountUppercase,
      progressVariance: calculation.progressVariance,
    };
    if (id) {
      await this.workflow.getEditable(id, user);
      const current = await this.repository.findPayment(id);
      if (!current) {
        throw new NotFoundException('合同付款单不存在');
      }
      const saved = await this.repository.savePayment({ ...current, ...fields });
      await this.workflow.updateDraftTitle(id, dto.project, user);
      return this.withIndex(saved);
    }
    const documentId = randomUUID();
    const saved = await this.repository.savePayment({
      id: documentId,
      number: createDocumentNumber('CONTRACT-PAYMENT', documentId),
      ...fields,
    });
    await this.workflow.registerDraft({
      id: documentId,
      documentType: 'CONTRACT_PAYMENT',
      module: 'CONTRACT',
      title: dto.project,
      applicantId: user.id,
      departmentId: user.departmentId,
    });
    return this.withIndex(saved);
  }

  async getRequest(id: string) {
    const entity = await this.repository.findRequest(id);
    if (!entity) {
      throw new NotFoundException('请示单不存在');
    }
    return this.withIndex(entity);
  }

  async getContract(id: string) {
    const entity = await this.repository.findContract(id);
    if (!entity) {
      throw new NotFoundException('合同审批单不存在');
    }
    return this.withIndex(entity);
  }

  async getPayment(id: string) {
    const entity = await this.repository.findPayment(id);
    if (!entity) {
      throw new NotFoundException('合同付款单不存在');
    }
    return this.withIndex(entity);
  }

  async listContracts() {
    const contracts = await this.repository.listContracts();
    const results = await Promise.all(contracts.map((contract) => this.withIndex(contract)));
    return results.filter((result) => result.document.status === 'APPROVED');
  }

  private async withIndex<T extends { id: string }>(entity: T) {
    return {
      data: entity,
      document: await this.workflow.getDocument(entity.id),
      opinions: await this.workflow.history(entity.id),
    };
  }
}
