import { Injectable, NotFoundException } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { readFileSync, statSync, writeFileSync, unlinkSync } from 'node:fs';
import { Like, type Repository } from 'typeorm';
import { DomainError } from '../../../common/errors/domain-error';
import {
  assertLibraryFileAllowed,
  libraryExtension,
  libraryFilePath,
  libraryMimeType,
} from '../domain/library-storage';
import {
  LibraryDocumentEntity,
  type LibraryCategory,
} from '../infrastructure/library-document.entity';

export interface LibraryDocumentPage {
  items: LibraryDocumentEntity[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LibraryUploadInput {
  title: string;
  category: LibraryCategory;
  description: string;
  fileName: string;
  content: Buffer;
}

@Injectable()
export class LibraryService {
  constructor(
    @InjectRepository(LibraryDocumentEntity)
    private readonly documents: Repository<LibraryDocumentEntity>,
  ) {}

  async list(input: {
    category?: LibraryCategory;
    keyword?: string;
    page: number;
    pageSize: number;
  }): Promise<LibraryDocumentPage> {
    const where: Record<string, unknown> = {};
    if (input.category) where.category = input.category;
    if (input.keyword) where.title = Like(`%${input.keyword}%`);
    const [items, total] = await this.documents.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    });
    return { items, total, page: input.page, pageSize: input.pageSize };
  }

  async upload(input: LibraryUploadInput, user: SessionUser): Promise<LibraryDocumentEntity> {
    if (!input.title.trim()) {
      throw new DomainError('LIBRARY_TITLE_REQUIRED', '请填写文件标题');
    }
    assertLibraryFileAllowed(input.fileName, input.content.byteLength);
    const id = randomUUID();
    const storedName = `${id}${libraryExtension(input.fileName)}`;
    writeFileSync(libraryFilePath(storedName), input.content);
    return this.documents.save({
      id,
      title: input.title.trim(),
      category: input.category,
      description: input.description.trim(),
      fileName: input.fileName,
      storedName,
      mimeType: libraryMimeType(input.fileName),
      sizeBytes: input.content.byteLength,
      uploaderId: user.id,
      uploaderName: user.displayName,
      downloadCount: 0,
    });
  }

  async findById(id: string): Promise<LibraryDocumentEntity> {
    const document = await this.documents.findOneBy({ id });
    if (!document) throw new NotFoundException('文件不存在或已被删除');
    return document;
  }

  /** 读取文件内容用于下载或内联预览，并累计下载次数。 */
  async readContent(id: string, countDownload: boolean): Promise<{
    document: LibraryDocumentEntity;
    content: Buffer;
  }> {
    const document = await this.findById(id);
    const path = libraryFilePath(document.storedName);
    try {
      statSync(path);
    } catch {
      throw new DomainError('LIBRARY_FILE_MISSING', '文件已从存储中丢失，请重新上传');
    }
    if (countDownload) {
      await this.documents.increment({ id }, 'downloadCount', 1);
    }
    return { document, content: readFileSync(path) };
  }

  async remove(id: string): Promise<void> {
    const document = await this.findById(id);
    try {
      unlinkSync(libraryFilePath(document.storedName));
    } catch {
      // 文件已不存在时仍删除记录，避免脏数据
    }
    await this.documents.delete({ id: document.id });
  }

}
