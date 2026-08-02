import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { PortalLink } from '../domain/portal.types';

@Entity('portal_quick_links')
export class PortalQuickLinkEntity implements PortalLink {
  @PrimaryColumn('text')
  id!: string;

  @Column('text')
  title!: string;

  @Column('text')
  url!: string;

  @Column('text')
  icon!: string;

  @Column('simple-json')
  requiredPermissionCodes!: string[];

  @Column('integer', { default: 0 })
  displayOrder!: number;

  @Column('boolean', { default: true })
  active!: boolean;
}
