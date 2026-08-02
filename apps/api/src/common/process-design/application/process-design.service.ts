import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { isDocumentType, type PublishedProcessSummary } from '@oa/contracts';
import { randomUUID } from 'node:crypto';
import { DomainError } from '../../errors/domain-error';
import {
  PROCESS_DESIGN_REPOSITORY,
  type ProcessDesignRepository,
} from '../domain/process-design.repository';
import {
  assertProcessVersionEditable,
  parsePublishedUserTasks,
  validateProcessForPublishing,
} from '../domain/process-design.rules';
import type {
  ProcessDefinitionDetail,
  ProcessVersion,
  PublishedProcessDesign,
} from '../domain/process-design.types';

export interface CreateProcessDefinitionInput {
  code: string;
  name: string;
  description?: string | null;
  documentType?: string | null;
  designJson: Record<string, unknown>;
  changeNote?: string | null;
}

export interface CopyProcessVersionInput {
  sourceVersionId?: string;
  changeNote?: string | null;
}

export interface UpdateProcessVersionInput {
  designJson?: Record<string, unknown>;
  changeNote?: string | null;
}

@Injectable()
export class ProcessDesignService {
  constructor(
    @Inject(PROCESS_DESIGN_REPOSITORY)
    private readonly repository: ProcessDesignRepository,
  ) {}

  list(): Promise<ProcessDefinitionDetail[]> {
    return this.repository.listDefinitions();
  }

  async listPublishedSummaries(): Promise<PublishedProcessSummary[]> {
    const definitions = await this.repository.listDefinitions();
    return definitions.flatMap((definition) => {
      const { documentType } = definition;
      if (!definition.active || !isDocumentType(documentType)) return [];
      const version = definition.versions.find((item) => item.status === 'PUBLISHED');
      if (!version) return [];
      return [
        {
          documentType,
          processCode: definition.code,
          processName: definition.name,
          version: version.version,
          approvalPath: parsePublishedUserTasks(version.designJson).map((task) => task.name),
        },
      ];
    });
  }

  async get(id: string): Promise<ProcessDefinitionDetail> {
    const definition = await this.repository.findDefinitionDetail(id);
    if (!definition) {
      throw new NotFoundException('流程定义不存在');
    }
    return definition;
  }

  findPublishedByDocumentType(documentType: string): Promise<PublishedProcessDesign | null> {
    return this.repository.findPublishedByDocumentType(documentType.trim().toUpperCase());
  }

  async create(
    dto: CreateProcessDefinitionInput,
    actorId: string,
  ): Promise<ProcessDefinitionDetail> {
    const code = dto.code.trim().toUpperCase();
    if (await this.repository.findDefinitionByCode(code)) {
      throw new DomainError('PROCESS_CODE_EXISTS', '流程编码已存在');
    }
    const documentType = dto.documentType?.trim().toUpperCase() || null;
    if (documentType && (await this.repository.findDefinitionByDocumentType(documentType))) {
      throw new DomainError('PROCESS_DOCUMENT_TYPE_EXISTS', '该单据类型已绑定其他流程');
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
        designJson: dto.designJson,
        changeNote: dto.changeNote?.trim() || null,
        createdBy: actorId,
        updatedBy: actorId,
      },
    });
    return this.get(definitionId);
  }

  async copyVersion(
    definitionId: string,
    dto: CopyProcessVersionInput,
    actorId: string,
  ): Promise<ProcessVersion> {
    if (!(await this.repository.findDefinition(definitionId))) {
      throw new NotFoundException('流程定义不存在');
    }
    const source = dto.sourceVersionId
      ? await this.repository.findVersion(dto.sourceVersionId)
      : await this.repository.findLatestVersion(definitionId);
    if (!source || source.definitionId !== definitionId) {
      throw new NotFoundException('源流程版本不存在');
    }
    const changeNote = dto.changeNote?.trim() || `基于 V${source.version} 创建`;
    return this.repository.copyVersion(definitionId, source, changeNote, actorId);
  }

  async updateVersion(
    versionId: string,
    dto: UpdateProcessVersionInput,
    actorId: string,
  ): Promise<ProcessVersion> {
    const version = await this.getVersion(versionId);
    assertProcessVersionEditable(version);
    if (dto.designJson === undefined && dto.changeNote === undefined) {
      throw new DomainError('PROCESS_VERSION_UPDATE_EMPTY', '至少需要修改一个流程版本字段');
    }
    const saved = await this.repository.updateDraftVersion(versionId, {
      designJson: dto.designJson ?? version.designJson,
      changeNote:
        dto.changeNote === undefined ? version.changeNote : dto.changeNote?.trim() || null,
      updatedBy: actorId,
    });
    if (!saved) {
      throw new DomainError('PROCESS_VERSION_STATE_CHANGED', '流程版本状态已变化，请刷新后重试');
    }
    return saved;
  }

  async publishVersion(versionId: string, actorId: string): Promise<ProcessVersion> {
    const version = await this.getVersion(versionId);
    assertProcessVersionEditable(version);
    validateProcessForPublishing(version);
    const published = await this.repository.publishDraftVersion(versionId, actorId);
    if (!published) {
      throw new DomainError('PROCESS_VERSION_STATE_CHANGED', '流程版本状态已变化，请刷新后重试');
    }
    return published;
  }

  async getVersion(versionId: string): Promise<ProcessVersion> {
    const version = await this.repository.findVersion(versionId);
    if (!version) {
      throw new NotFoundException('流程版本不存在');
    }
    return version;
  }
}
