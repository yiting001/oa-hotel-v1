import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { PortalWidget } from '../domain/portal.types';

@Entity('portal_widgets')
export class PortalWidgetEntity implements PortalWidget {
  @PrimaryColumn('text')
  ownerId!: string;

  @PrimaryColumn('text')
  widgetKey!: string;

  @Column('text')
  title!: string;

  @Column('integer', { default: 0 })
  displayOrder!: number;

  @Column('boolean', { default: true })
  visible!: boolean;
}
