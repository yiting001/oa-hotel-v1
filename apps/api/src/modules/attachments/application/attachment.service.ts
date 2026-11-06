import { Injectable, NotFoundException } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import type { Repository } from 'typeorm';
import { DomainError } from '../../../common/errors/domain-error';
import {
  assertUploadFileAllowed,
  fileExtension,
  storageRoot,
  storedFilePath,
  uploadMimeType,
} from '../../../common/storage/file-storage';
import { DocumentAttachmentEntity } from '../infrastructure/document-attachment.entity';

export interface AttachmentUploadInput {
  fileName: string;
  content: Buffer;
}

/** 单据附件：文件落在 storage/attachments，元数据存 document_attachments。 */
@Injectable()
export class AttachmentService {
  constructor(
    @InjectRepository(DocumentAttachmentEntity)
    private readonly attachments: Repository<DocumentAttachmentEntity>,
  ) {}

  async upload(input: AttachmentUploadInput, user: SessionUser): Promise<DocumentAttachmentEntity> {
    if (!input.fileName.trim()) {
      throw new DomainError('ATTACHMENT_FILE_REQUIRED', '请选择要上传的文件');
    }
    assertUploadFileAllowed(input.fileName, input.content.byteLength);
    const id = randomUUID();
    const storedName = `${id}${fileExtension(input.fileName)}`;
    writeFileSync(this.filePath(storedName), input.content);
    return this.attachments.save({
      id,
      fileName: input.fileName,
      storedName,
      mimeType: uploadMimeType(input.fileName),
      sizeBytes: input.content.byteLength,
      uploaderId: user.id,
      uploaderName: user.displayName,
    });
  }

  async findById(id: string): Promise<DocumentAttachmentEntity> {
    const attachment = await this.attachments.findOneBy({ id });
    if (!attachment) throw new NotFoundException('附件不存在或已被删除');
    return attachment;
  }

  async readContent(
    id: string,
  ): Promise<{ attachment: DocumentAttachmentEntity; content: Buffer }> {
    const attachment = await this.findById(id);
    const path = this.filePath(attachment.storedName);
    try {
      statSync(path);
    } catch {
      throw new DomainError('ATTACHMENT_FILE_MISSING', '附件文件已从存储中丢失，请重新上传');
    }
    return { attachment, content: readFileSync(path) };
  }

  private filePath(storedName: string): string {
    return storedFilePath(storageRoot('attachments'), storedName);
  }
}
