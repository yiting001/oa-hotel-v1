import { Injectable } from '@nestjs/common';
import { DOCUMENT_NUMBER_PREFIXES, type DocumentType } from '@oa/contracts';
import type { EntityManager } from 'typeorm';
import { businessDateKey } from '../../time/business-date';
import { DocumentNumberSequenceEntity } from '../infrastructure/document-number-sequence.entity';

/** 统一单据编号：前缀 + 发起日期(yyyyMMdd) + 3 位流水号，例如 HT20260727001。 */
@Injectable()
export class DocumentNumberService {
  documentNumberPrefix(documentType: DocumentType): string | null {
    return DOCUMENT_NUMBER_PREFIXES[documentType] ?? null;
  }

  async generate(manager: EntityManager, prefix: string, now = new Date()): Promise<string> {
    const dateKey = businessDateKey(now);
    const repository = manager.getRepository(DocumentNumberSequenceEntity);
    await manager.query(
      `INSERT INTO "document_number_sequences" ("prefix", "dateKey", "nextSerial")
        VALUES (?, ?, 2)
        ON CONFLICT ("prefix", "dateKey") DO UPDATE SET "nextSerial" = "nextSerial" + 1`,
      [prefix, dateKey],
    );
    const sequence = await repository.findOneByOrFail({ prefix, dateKey });
    const serial = sequence.nextSerial - 1;
    return `${prefix}${dateKey}${String(serial).padStart(3, '0')}`;
  }
}
