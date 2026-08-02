import type { PortalAudienceType, PortalContentCategory, PortalContentStatus } from '@oa/contracts';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import type { PortalContent } from '../domain/portal.types';

@Entity('portal_contents')
export class PortalContentEntity implements PortalContent {
  @PrimaryColumn('text')
  id!: string;

  @Index()
  @Column('text')
  category!: PortalContentCategory;

  @Column('text')
  title!: string;

  @Column('text')
  summary!: string;

  @Column('text', { select: false })
  body!: string;

  @Column('text')
  publisherId!: string;

  @Column('text')
  publisherName!: string;

  @Column('text', { nullable: true })
  publisherDepartmentId!: string | null;

  @Column('text', { nullable: true })
  publisherDepartmentName!: string | null;

  @Index()
  @Column('text')
  audienceType!: PortalAudienceType;

  @Column('simple-json')
  audienceIds!: string[];

  @Column('boolean', { default: false })
  pinned!: boolean;

  @Column('boolean', { default: false })
  requiresReceipt!: boolean;

  @Column('text', { nullable: true })
  coverImageUrl!: string | null;

  @Column('simple-json', { select: false })
  attachments!: string[];

  @Index()
  @Column('text', { default: 'DRAFT' })
  status!: PortalContentStatus;

  @Column('integer', { default: 1 })
  currentRevision!: number;

  @Index()
  @Column('datetime', { nullable: true })
  publishedAt!: Date | null;

  @Column('datetime', { nullable: true })
  offlineAt!: Date | null;

  @Column('datetime', { nullable: true })
  withdrawnAt!: Date | null;

  @Column('datetime')
  createdAt!: Date;

  @Column('datetime')
  updatedAt!: Date;
}
