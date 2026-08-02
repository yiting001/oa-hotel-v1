import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import type { PortalEvent } from '../domain/portal.types';

@Entity('portal_calendar_events')
export class PortalCalendarEventEntity implements PortalEvent {
  @PrimaryColumn('text')
  id!: string;

  @Column('text')
  title!: string;

  @Index()
  @Column('datetime')
  startAt!: Date;

  @Column('datetime')
  endAt!: Date;

  @Column('boolean', { default: false })
  allDay!: boolean;

  @Column('text', { nullable: true })
  location!: string | null;

  @Column('text')
  kind!: string;

  @Column('integer', { default: 0 })
  displayOrder!: number;

  @Column('boolean', { default: true })
  active!: boolean;
}
