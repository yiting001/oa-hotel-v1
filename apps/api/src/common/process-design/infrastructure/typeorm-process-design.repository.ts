import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, In, Repository } from 'typeorm';
import type {
  CreateProcessDefinitionRecord,
  ProcessDesignRepository,
  UpdateProcessVersionRecord,
} from '../domain/process-design.repository';
import type {
  ProcessDefinition,
  ProcessDefinitionDetail,
  ProcessVersion,
  PublishedProcessDesign,
} from '../domain/process-design.types';
import { ProcessDefinitionEntity } from './process-definition.entity';
import { ProcessVersionEntity } from './process-version.entity';

@Injectable()
export class TypeOrmProcessDesignRepository implements ProcessDesignRepository {
  constructor(
    @InjectRepository(ProcessDefinitionEntity)
    private readonly definitions: Repository<ProcessDefinitionEntity>,
    @InjectRepository(ProcessVersionEntity)
    private readonly versions: Repository<ProcessVersionEntity>,
    @Inject(DataSource)
    private readonly dataSource: DataSource,
  ) {}

  async listDefinitions(): Promise<ProcessDefinitionDetail[]> {
    const definitions = await this.definitions.find({ order: { updatedAt: 'DESC' } });
    if (definitions.length === 0) {
      return [];
    }
    const versions = await this.versions.find({
      where: { definitionId: In(definitions.map((definition) => definition.id)) },
      order: { version: 'DESC' },
    });
    const versionsByDefinition = new Map<string, ProcessVersionEntity[]>();
    for (const version of versions) {
      const group = versionsByDefinition.get(version.definitionId) ?? [];
      group.push(version);
      versionsByDefinition.set(version.definitionId, group);
    }
    return definitions.map((definition) => ({
      ...definition,
      versions: versionsByDefinition.get(definition.id) ?? [],
    }));
  }

  findDefinition(id: string): Promise<ProcessDefinition | null> {
    return this.definitions.findOneBy({ id });
  }

  findDefinitionByCode(code: string): Promise<ProcessDefinition | null> {
    return this.definitions.findOneBy({ code });
  }

  findDefinitionByDocumentType(documentType: string): Promise<ProcessDefinition | null> {
    return this.definitions.findOneBy({ documentType });
  }

  async findDefinitionDetail(id: string): Promise<ProcessDefinitionDetail | null> {
    const definition = await this.definitions.findOneBy({ id });
    return definition ? this.withVersions(definition) : null;
  }

  async findPublishedByDocumentType(documentType: string): Promise<PublishedProcessDesign | null> {
    const definition = await this.definitions.findOneBy({ documentType, active: true });
    if (!definition) {
      return null;
    }
    const version = await this.versions.findOne({
      where: { definitionId: definition.id, status: 'PUBLISHED' },
      order: { version: 'DESC' },
    });
    return version ? { definition, version } : null;
  }

  findVersion(id: string): Promise<ProcessVersion | null> {
    return this.versions.findOneBy({ id });
  }

  findLatestVersion(definitionId: string): Promise<ProcessVersion | null> {
    return this.versions.findOne({
      where: { definitionId },
      order: { version: 'DESC' },
    });
  }

  async createDefinition(record: CreateProcessDefinitionRecord): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(ProcessDefinitionEntity).save(record.definition);
      await manager.getRepository(ProcessVersionEntity).save({
        ...record.version,
        publishedAt: null,
      });
    });
  }

  async copyVersion(
    definitionId: string,
    source: ProcessVersion,
    changeNote: string,
    actorId: string,
  ): Promise<ProcessVersion> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(ProcessVersionEntity);
      const row = await repository
        .createQueryBuilder('version')
        .select('MAX(version.version)', 'maximum')
        .where('version.definitionId = :definitionId', { definitionId })
        .getRawOne<{ maximum: number | string | null }>();
      const nextVersion = Number(row?.maximum ?? 0) + 1;
      return repository.save({
        id: randomUUID(),
        definitionId,
        version: nextVersion,
        status: 'DRAFT',
        designJson: source.designJson,
        changeNote,
        createdBy: actorId,
        updatedBy: actorId,
        publishedAt: null,
      });
    });
  }

  async updateDraftVersion(
    versionId: string,
    update: UpdateProcessVersionRecord,
  ): Promise<ProcessVersion | null> {
    // TypeORM's deep-partial type cannot represent a simple-json object, although the driver can.
    const result = await this.versions.update(
      { id: versionId, status: 'DRAFT' },
      { ...update, designJson: update.designJson as never },
    );
    return result.affected === 1 ? this.versions.findOneBy({ id: versionId }) : null;
  }

  async publishDraftVersion(versionId: string, actorId: string): Promise<ProcessVersion | null> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(ProcessVersionEntity);
      const target = await repository.findOneBy({ id: versionId });
      if (!target || target.status !== 'DRAFT') {
        return null;
      }
      await repository.update(
        { definitionId: target.definitionId, status: 'PUBLISHED' },
        { status: 'RETIRED', updatedBy: actorId },
      );
      const result = await repository.update(
        { id: versionId, status: 'DRAFT' },
        { status: 'PUBLISHED', publishedAt: new Date(), updatedBy: actorId },
      );
      return result.affected === 1 ? repository.findOneBy({ id: versionId }) : null;
    });
  }

  private async withVersions(
    definition: ProcessDefinitionEntity,
  ): Promise<ProcessDefinitionDetail> {
    const versions = await this.versions.find({
      where: { definitionId: definition.id },
      order: { version: 'DESC' },
    });
    return { ...definition, versions };
  }
}
