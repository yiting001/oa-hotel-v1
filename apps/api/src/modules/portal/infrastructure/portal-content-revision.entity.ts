import { Column, Entity, Index, PrimaryColumn, Unique } from 'typeorm';
import type { PortalContentRevision, PortalContentRevisionSnapshot } from '../domain/portal.types';

@Entity('portal_content_revisions')
@Unique('UQ_portal_content_revision', ['contentId', 'revision'])
export class PortalContentRevisionEntity implements PortalContentRevision {
  @PrimaryColumn('text')
  id!: string;

  @Index()
  @Column('text')
  contentId!: string;

  @Column('integer')
  revision!: number;

  @Column('simple-json')
  snapshot!: PortalContentRevisionSnapshot;

  @Column('datetime')
  createdAt!: Date;
}
