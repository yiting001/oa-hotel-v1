import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { SessionUser } from '@oa/contracts';
import { Repository } from 'typeorm';
import { UserEntity } from '../../../common/auth/user.entity';
import { businessDateKey } from '../../../common/time/business-date';
import { DocumentIndexEntity } from '../../../common/workflow/infrastructure/document-index.entity';
import { WorkflowOpinionEntity } from '../../../common/workflow/infrastructure/workflow-opinion.entity';
import { ContractEntity } from '../../contract/infrastructure/contract.entity';
import { PettyProcurementEntity } from '../../petty/infrastructure/petty-procurement.entity';
import { PurchaseEntity } from '../../purchase/infrastructure/purchase.entity';
import type {
  DocumentSearchQuery,
  OperationLogQuery,
  StatisticsQuery,
} from '../presentation/insight.dto';

export interface DocumentSearchRow {
  id: string;
  documentType: string;
  documentNo: string | null;
  title: string;
  status: string;
  applicantId: string;
  applicantName: string;
  amountCents: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OperationLogRow {
  id: string;
  documentId: string;
  documentNo: string | null;
  documentTitle: string;
  actorName: string;
  action: string;
  comment: string;
  createdAt: Date;
}

export interface StatisticsBucket {
  period: string;
  documentType: string;
  count: number;
  amountCents: number;
}

const TRACKED_TYPES = ['CONTRACT_APPROVAL', 'PURCHASE_APPROVAL', 'PETTY_PROCUREMENT'];

function isAdmin(user: SessionUser): boolean {
  return user.permissionCodes.includes('IAM_MANAGE');
}

@Injectable()
export class InsightService {
  constructor(
    @InjectRepository(DocumentIndexEntity)
    private readonly documents: Repository<DocumentIndexEntity>,
    @InjectRepository(WorkflowOpinionEntity)
    private readonly opinions: Repository<WorkflowOpinionEntity>,
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    @InjectRepository(ContractEntity)
    private readonly contracts: Repository<ContractEntity>,
    @InjectRepository(PurchaseEntity)
    private readonly purchases: Repository<PurchaseEntity>,
    @InjectRepository(PettyProcurementEntity)
    private readonly pettyProcurements: Repository<PettyProcurementEntity>,
  ) {}

  async searchDocuments(
    query: DocumentSearchQuery,
    user: SessionUser,
  ): Promise<DocumentSearchRow[]> {
    const builder = this.documents
      .createQueryBuilder('document')
      .orderBy('document.updatedAt', 'DESC');
    if (!isAdmin(user)) {
      builder.andWhere('document.applicantId = :userId', { userId: user.id });
    }
    if (query.documentType) {
      builder.andWhere('document.documentType = :documentType', {
        documentType: query.documentType,
      });
    }
    if (query.status) {
      builder.andWhere('document.status = :status', { status: query.status });
    }
    if (query.number) {
      builder.andWhere('document.documentNo LIKE :number', { number: `%${query.number}%` });
    }
    if (query.keyword) {
      builder.andWhere('document.title LIKE :keyword', { keyword: `%${query.keyword}%` });
    }
    if (query.dateFrom) {
      builder.andWhere('document.createdAt >= :dateFrom', {
        dateFrom: `${query.dateFrom} 00:00:00`,
      });
    }
    if (query.dateTo) {
      builder.andWhere('document.createdAt <= :dateTo', { dateTo: `${query.dateTo} 23:59:59` });
    }
    const documents = await builder.take(500).getMany();

    const [amountMap, userMap] = await Promise.all([
      this.loadAmountMap(documents.map((document) => document.id)),
      this.loadUserMap(documents.map((document) => document.applicantId)),
    ]);

    let rows = documents.map((document) => ({
      id: document.id,
      documentType: document.documentType,
      documentNo: document.documentNo,
      title: document.title,
      status: document.status,
      applicantId: document.applicantId,
      applicantName: userMap.get(document.applicantId) ?? document.applicantId,
      amountCents: amountMap.get(document.id) ?? null,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    }));

    if (query.applicant) {
      const normalized = query.applicant.trim().toLocaleLowerCase();
      rows = rows.filter((row) => row.applicantName.toLocaleLowerCase().includes(normalized));
    }
    if (query.amountMinCents !== undefined) {
      rows = rows.filter(
        (row) => row.amountCents !== null && row.amountCents >= query.amountMinCents!,
      );
    }
    if (query.amountMaxCents !== undefined) {
      rows = rows.filter(
        (row) => row.amountCents !== null && row.amountCents <= query.amountMaxCents!,
      );
    }
    return rows;
  }

  async listOperationLogs(query: OperationLogQuery): Promise<OperationLogRow[]> {
    const builder = this.opinions
      .createQueryBuilder('opinion')
      .orderBy('opinion.createdAt', 'DESC')
      .take(500);
    if (query.actor) {
      builder.andWhere('opinion.actorName LIKE :actor', { actor: `%${query.actor}%` });
    }
    if (query.action) {
      builder.andWhere('opinion.action = :action', { action: query.action });
    }
    if (query.dateFrom) {
      builder.andWhere('opinion.createdAt >= :dateFrom', {
        dateFrom: `${query.dateFrom} 00:00:00`,
      });
    }
    if (query.dateTo) {
      builder.andWhere('opinion.createdAt <= :dateTo', { dateTo: `${query.dateTo} 23:59:59` });
    }
    const opinions = await builder.getMany();
    const documentIds = [...new Set(opinions.map((opinion) => opinion.documentId))];
    const documentMap = await this.loadDocumentMap(documentIds);

    let rows: OperationLogRow[] = opinions.map((opinion) => {
      const document = documentMap.get(opinion.documentId);
      return {
        id: opinion.id,
        documentId: opinion.documentId,
        documentNo: document?.documentNo ?? null,
        documentTitle: document?.title ?? opinion.documentId,
        actorName: opinion.actorName,
        action: opinion.action,
        comment: opinion.comment ?? '',
        createdAt: opinion.createdAt,
      };
    });
    if (query.number) {
      const normalized = query.number.trim().toLocaleLowerCase();
      rows = rows.filter((row) => (row.documentNo ?? '').toLocaleLowerCase().includes(normalized));
    }
    return rows;
  }

  async statistics(query: StatisticsQuery): Promise<StatisticsBucket[]> {
    const builder = this.documents
      .createQueryBuilder('document')
      .where('document.documentType IN (:...types)', { types: TRACKED_TYPES })
      .andWhere("document.status != 'DRAFT'");
    if (query.dateFrom) {
      builder.andWhere('document.createdAt >= :dateFrom', {
        dateFrom: `${query.dateFrom} 00:00:00`,
      });
    }
    if (query.dateTo) {
      builder.andWhere('document.createdAt <= :dateTo', { dateTo: `${query.dateTo} 23:59:59` });
    }
    const documents = await builder.getMany();
    const amountMap = await this.loadAmountMap(documents.map((document) => document.id));

    const buckets = new Map<string, StatisticsBucket>();
    for (const document of documents) {
      const period = this.periodKey(document.createdAt, query.granularity ?? 'month');
      const key = `${period}|${document.documentType}`;
      const bucket = buckets.get(key) ?? {
        period,
        documentType: document.documentType,
        count: 0,
        amountCents: 0,
      };
      bucket.count += 1;
      bucket.amountCents += amountMap.get(document.id) ?? 0;
      buckets.set(key, bucket);
    }
    return [...buckets.values()].sort((left, right) => left.period.localeCompare(right.period));
  }

  private periodKey(date: Date, granularity: string): string {
    const dateKey = businessDateKey(date);
    const year = dateKey.slice(0, 4);
    const month = dateKey.slice(4, 6);
    const day = dateKey.slice(6, 8);
    switch (granularity) {
      case 'day':
        return `${year}-${month}-${day}`;
      case 'week': {
        const target = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
        const dayOfWeek = target.getUTCDay() || 7;
        target.setUTCDate(target.getUTCDate() + 4 - dayOfWeek);
        const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
        const week = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
        return `${target.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
      }
      case 'year':
        return year;
      case 'month':
      default:
        return `${year}-${month}`;
    }
  }

  private async loadAmountMap(documentIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (documentIds.length === 0) return map;
    const [contracts, purchases, petty] = await Promise.all([
      this.contracts
        .createQueryBuilder('contract')
        .select(['contract.id', 'contract.amountCents'])
        .where('contract.id IN (:...ids)', { ids: documentIds })
        .getMany(),
      this.purchases
        .createQueryBuilder('purchase')
        .select(['purchase.id', 'purchase.amountCents'])
        .where('purchase.id IN (:...ids)', { ids: documentIds })
        .getMany(),
      this.pettyProcurements
        .createQueryBuilder('petty')
        .select(['petty.id', 'petty.totalAmountCents'])
        .where('petty.id IN (:...ids)', { ids: documentIds })
        .getMany(),
    ]);
    for (const contract of contracts) map.set(contract.id, contract.amountCents);
    for (const purchase of purchases) map.set(purchase.id, purchase.amountCents);
    for (const procurement of petty) map.set(procurement.id, procurement.totalAmountCents);
    return map;
  }

  private async loadUserMap(userIds: string[]): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (userIds.length === 0) return map;
    const users = await this.users
      .createQueryBuilder('user')
      .select(['user.id', 'user.displayName'])
      .where('user.id IN (:...ids)', { ids: [...new Set(userIds)] })
      .getMany();
    for (const user of users) map.set(user.id, user.displayName);
    return map;
  }

  private async loadDocumentMap(documentIds: string[]): Promise<Map<string, DocumentIndexEntity>> {
    const map = new Map<string, DocumentIndexEntity>();
    if (documentIds.length === 0) return map;
    const documents = await this.documents
      .createQueryBuilder('document')
      .where('document.id IN (:...ids)', { ids: documentIds })
      .getMany();
    for (const document of documents) map.set(document.id, document);
    return map;
  }
}
