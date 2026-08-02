import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DomainError } from '../../errors/domain-error';
import {
  FORM_DESIGN_REPOSITORY,
  type FormDesignRepository,
} from '../domain/form-design.repository';
import { assertFormVersionEditable, validateFormForPublishing } from '../domain/form-design.rules';
import type {
  FormDefinitionDetail,
  FormVersion,
  PublishedFormDesign,
} from '../domain/form-design.types';

export interface CreateFormDefinitionInput {
  code: string;
  name: string;
  description?: string | null;
  documentType?: string | null;
  schemaJson: Record<string, unknown>;
  printSchemaJson: Record<string, unknown>;
  changeNote?: string | null;
}

export interface CopyFormVersionInput {
  sourceVersionId?: string;
  changeNote?: string | null;
}

export interface UpdateFormVersionInput {
  schemaJson?: Record<string, unknown>;
  printSchemaJson?: Record<string, unknown>;
  changeNote?: string | null;
}

@Injectable()
export class FormDesignService {
  constructor(
    @Inject(FORM_DESIGN_REPOSITORY)
    private readonly repository: FormDesignRepository,
  ) {}

  list(): Promise<FormDefinitionDetail[]> {
    return this.repository.listDefinitions();
  }

  async get(id: string): Promise<FormDefinitionDetail> {
    const definition = await this.repository.findDefinitionDetail(id);
    if (!definition) {
      throw new NotFoundException('表单定义不存在');
    }
    return definition;
  }

  findPublishedByDocumentType(documentType: string): Promise<PublishedFormDesign | null> {
    return this.repository.findPublishedByDocumentType(documentType.trim().toUpperCase());
  }

  async create(dto: CreateFormDefinitionInput, actorId: string): Promise<FormDefinitionDetail> {
    const code = dto.code.trim().toUpperCase();
    if (await this.repository.findDefinitionByCode(code)) {
      throw new DomainError('FORM_CODE_EXISTS', '表单编码已存在');
    }
    const documentType = dto.documentType?.trim().toUpperCase() || null;
    if (documentType && (await this.repository.findDefinitionByDocumentType(documentType))) {
      throw new DomainError('FORM_DOCUMENT_TYPE_EXISTS', '该单据类型已绑定其他表单');
    }
    const definitionId = randomUUID();
    await this.repository.createDefinition({
      definition: {
        id: definitionId,
        code,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        documentType,
        createdBy: actorId,
      },
      version: {
        id: randomUUID(),
        definitionId,
        version: 1,
        status: 'DRAFT',
        schemaJson: dto.schemaJson,
        printSchemaJson: dto.printSchemaJson,
        changeNote: dto.changeNote?.trim() || null,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    return this.get(definitionId);
  }

  async copyVersion(
    definitionId: string,
    dto: CopyFormVersionInput,
    actorId: string,
  ): Promise<FormVersion> {
    if (!(await this.repository.findDefinition(definitionId))) {
      throw new NotFoundException('表单定义不存在');
    }
    const source = dto.sourceVersionId
      ? await this.repository.findVersion(dto.sourceVersionId)
      : await this.repository.findLatestVersion(definitionId);
    if (!source || source.definitionId !== definitionId) {
      throw new NotFoundException('源表单版本不存在');
    }
    const changeNote = dto.changeNote?.trim() || `基于 V${source.version} 创建`;
    return this.repository.copyVersion(definitionId, source, changeNote, actorId);
  }

  async updateVersion(
    versionId: string,
    dto: UpdateFormVersionInput,
    actorId: string,
  ): Promise<FormVersion> {
    const version = await this.getVersion(versionId);
    assertFormVersionEditable(version);
    if (
      dto.schemaJson === undefined &&
      dto.printSchemaJson === undefined &&
      dto.changeNote === undefined
    ) {
      throw new DomainError('FORM_VERSION_UPDATE_EMPTY', '至少需要修改一个表单版本字段');
    }
    const saved = await this.repository.updateDraftVersion(versionId, {
      schemaJson: dto.schemaJson ?? version.schemaJson,
      printSchemaJson: dto.printSchemaJson ?? version.printSchemaJson,
      changeNote:
        dto.changeNote === undefined ? version.changeNote : dto.changeNote?.trim() || null,
      updatedBy: actorId,
    });
    if (!saved) {
      throw new DomainError('FORM_VERSION_STATE_CHANGED', '表单版本状态已变化，请刷新后重试');
    }
    return saved;
  }

  async publishVersion(versionId: string, actorId: string): Promise<FormVersion> {
    const version = await this.getVersion(versionId);
    assertFormVersionEditable(version);
    validateFormForPublishing(version);
    const published = await this.repository.publishDraftVersion(versionId, actorId);
    if (!published) {
      throw new DomainError('FORM_VERSION_STATE_CHANGED', '表单版本状态已变化，请刷新后重试');
    }
    return published;
  }

  async getVersion(versionId: string): Promise<FormVersion> {
    const version = await this.repository.findVersion(versionId);
    if (!version) {
      throw new NotFoundException('表单版本不存在');
    }
    return version;
  }
}
