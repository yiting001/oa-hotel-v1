import { Column, Entity, Index, PrimaryColumn, Unique } from 'typeorm';
import { DATETIME_COLUMN_TYPE } from '../../../common/database/column-types';
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

  @Column(DATETIME_COLUMN_TYPE)
  createdAt!: Date;
}
