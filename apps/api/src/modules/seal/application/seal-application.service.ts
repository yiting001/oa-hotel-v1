import { Inject, Injectable, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { randomUUID } from 'node:crypto';
import { createDocumentNumber } from '../../../common/domain/document-number';
import { DomainError } from '../../../common/errors/domain-error';
import { DocumentWorkflowService } from '../../../common/workflow/application/document-workflow.service';
import { requireSealManager, validateBorrowPeriod } from '../domain/seal-request';
import { SEAL_REPOSITORY, type SealRepository } from '../domain/seal.repository';
import type {
  SealBorrowDto,
  SealCheckoutDto,
  SealExecuteDto,
  SealReturnDto,
  SealUseDto,
} from '../presentation/seal.dto';

@Injectable()
export class SealApplicationService implements OnApplicationBootstrap {
  constructor(
    @Inject(SEAL_REPOSITORY)
    private readonly repository: SealRepository,
    @Inject(DocumentWorkflowService)
    private readonly workflow: DocumentWorkflowService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.NODE_ENV === 'production' || (await this.repository.countAssets()) > 0) {
      return;
    }
    await this.repository.saveAssets([
      {
        id: 'seal-company',
        code: 'SEAL-COMPANY',
        name: '公司公章',
        type: 'SEAL',
        custodianUserId: 'user-office',
        status: 'AVAILABLE',
        activeBorrowRequestId: null,
        validUntil: null,
      },
      {
        id: 'license-business',
        code: 'LICENSE-BUSINESS',
        name: '营业执照',
        type: 'LICENSE',
        custodianUserId: 'user-office',
        status: 'AVAILABLE',
        activeBorrowRequestId: null,
        validUntil: null,
      },
    ]);
  }

  listAssets() {
    return this.repository.listAssets();
  }

  async saveBorrow(dto: SealBorrowDto, user: SessionUser, id?: string) {
    validateBorrowPeriod(dto.useDate, dto.plannedReturnDate);
    await this.ensureAssets(dto.sealAssetIds);
    if (id) {
      await this.workflow.getEditable(id, user);
      const current = await this.repository.findBorrow(id);
      if (!current) {
        throw new NotFoundException('外借申请不存在');
      }
      const saved = await this.repository.saveBorrow({ ...current, ...dto });
      return this.withIndex(saved);
    }
    const documentId = randomUUID();
    const saved = await this.repository.saveBorrow({
      id: documentId,
      number: createDocumentNumber('SEAL-BORROW', documentId),
      applicantId: user.id,
      departmentId: user.departmentId,
      applicationDate: new Date().toISOString(),
      executionStatus: 'NOT_CHECKED_OUT',
      actualRecipient: null,
      checkedOutAt: null,
      returnedAt: null,
      returnCondition: null,
      exceptionNote: null,
      ...dto,
    });
    await this.workflow.registerDraft({
      id: documentId,
      documentType: 'SEAL_BORROW',
      module: 'SEAL',
      title: `印章证照外借：${dto.destination}`,
      applicantId: user.id,
      departmentId: user.departmentId,
    });
    return this.withIndex(saved);
  }

  async saveUse(dto: SealUseDto, user: SessionUser, id?: string) {
    await this.ensureAssets(dto.sealAssetIds);
    if (id) {
      await this.workflow.getEditable(id, user);
      const current = await this.repository.findUse(id);
      if (!current) {
        throw new NotFoundException('用印申请不存在');
      }
      const saved = await this.repository.saveUse({ ...current, ...dto });
      return this.withIndex(saved);
    }
    const documentId = randomUUID();
    const saved = await this.repository.saveUse({
      id: documentId,
      number: createDocumentNumber('SEAL-USE', documentId),
      applicantId: user.id,
      departmentId: user.departmentId,
      applicationDate: new Date().toISOString(),
      executionStatus: 'NOT_EXECUTED',
      stampedCopies: null,
      executedAt: null,
      archiveNumber: null,
      executionNote: null,
      ...dto,
    });
    await this.workflow.registerDraft({
      id: documentId,
      documentType: 'SEAL_USE',
      module: 'SEAL',
      title: `印章证照使用：${dto.purpose}`,
      applicantId: user.id,
      departmentId: user.departmentId,
    });
    return this.withIndex(saved);
  }

  async checkout(id: string, dto: SealCheckoutDto, user: SessionUser) {
    requireSealManager(user.roleCodes);
    const request = await this.getApprovedBorrow(id);
    if (request.executionStatus !== 'NOT_CHECKED_OUT') {
      throw new DomainError('SEAL_ALREADY_CHECKED_OUT', '该申请已完成领用登记');
    }
    request.executionStatus = 'CHECKED_OUT';
    request.actualRecipient = dto.actualRecipient;
    request.checkedOutAt = dto.checkedOutAt;
    await this.repository.checkoutAssets(request.sealAssetIds, request.id);
    return this.withIndex(await this.repository.saveBorrow(request));
  }

  async returnBorrow(id: string, dto: SealReturnDto, user: SessionUser) {
    requireSealManager(user.roleCodes);
    const request = await this.getApprovedBorrow(id);
    if (request.executionStatus !== 'CHECKED_OUT') {
      throw new DomainError('SEAL_NOT_CHECKED_OUT', '该申请尚未领用或已归还');
    }
    request.executionStatus = dto.exceptionNote ? 'RETURNED_WITH_EXCEPTION' : 'RETURNED';
    request.returnedAt = dto.returnedAt;
    request.returnCondition = dto.returnCondition;
    request.exceptionNote = dto.exceptionNote;
    await this.repository.returnAssets(request.sealAssetIds);
    return this.withIndex(await this.repository.saveBorrow(request));
  }

  async executeUse(id: string, dto: SealExecuteDto, user: SessionUser) {
    requireSealManager(user.roleCodes);
    const request = await this.repository.findUse(id);
    if (!request) {
      throw new NotFoundException('用印申请不存在');
    }
    const document = await this.workflow.getDocument(id);
    if (document.status !== 'APPROVED') {
      throw new DomainError('DOCUMENT_NOT_APPROVED', '审批完成后才能登记用印');
    }
    if (request.executionStatus === 'EXECUTED') {
      throw new DomainError('SEAL_ALREADY_EXECUTED', '该申请已完成用印登记');
    }
    Object.assign(request, dto, { executionStatus: 'EXECUTED' });
    return this.withIndex(await this.repository.saveUse(request));
  }

  async getBorrow(id: string) {
    const request = await this.repository.findBorrow(id);
    if (!request) {
      throw new NotFoundException('外借申请不存在');
    }
    return this.withIndex(request);
  }

  async getUse(id: string) {
    const request = await this.repository.findUse(id);
    if (!request) {
      throw new NotFoundException('用印申请不存在');
    }
    return this.withIndex(request);
  }

  private async getApprovedBorrow(id: string) {
    const request = await this.repository.findBorrow(id);
    if (!request) {
      throw new NotFoundException('外借申请不存在');
    }
    const document = await this.workflow.getDocument(id);
    if (document.status !== 'APPROVED') {
      throw new DomainError('DOCUMENT_NOT_APPROVED', '审批完成后才能登记外借');
    }
    return request;
  }

  private async ensureAssets(ids: string[]): Promise<void> {
    const assets = await this.repository.findAssets(ids);
    if (assets.length !== new Set(ids).size) {
      throw new DomainError('SEAL_ASSET_NOT_FOUND', '选择的印章证照不存在');
    }
  }

  private async withIndex<T extends { id: string }>(entity: T) {
    return {
      data: entity,
      document: await this.workflow.getDocument(entity.id),
      opinions: await this.workflow.history(entity.id),
    };
  }
}
