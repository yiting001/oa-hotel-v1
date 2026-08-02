import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import type { MenuType } from '@oa/contracts';

@Entity('iam_menus')
@Index(['parentId'])
export class MenuEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text', { nullable: true })
  parentId!: string | null;

  @Column('text')
  name!: string;

  @Column('text')
  type!: MenuType;

  @Column('text', { nullable: true })
  path!: string | null;

  @Column('text', { nullable: true })
  permissionCode!: string | null;

  @Column('text', { nullable: true })
  icon!: string | null;

  @Column('integer', { default: 0 })
  orderNum!: number;

  @Column('boolean', { default: true })
  visible!: boolean;

  @Column('boolean', { default: true })
  active!: boolean;
}
