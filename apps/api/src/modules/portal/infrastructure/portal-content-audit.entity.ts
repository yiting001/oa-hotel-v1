import type { PortalContentAuditAction } from '@oa/contracts';
import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import type { PortalContentAudit } from '../domain/portal.types';

@Entity('portal_content_audits')
export class PortalContentAuditEntity implements PortalContentAudit {
  @PrimaryColumn('text')
  id!: string;

  @Index()
  @Column('text')
  contentId!: string;

  @Column('text')
  action!: PortalContentAuditAction;

  @Column('text')
  actorId!: string;

  @Column('text')
  actorName!: string;

  @Column('text', { nullable: true })
  actorDepartmentName!: string | null;

  @Column('integer')
  revision!: number;

  @Index()
  @Column('datetime')
  occurredAt!: Date;

  @Column('simple-json')
  details!: Record<string, unknown>;
}
