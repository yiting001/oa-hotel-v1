import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('iam_permissions')
export class PermissionEntity {
  @PrimaryColumn('text')
  id!: string;

  @Index({ unique: true })
  @Column('text')
  code!: string;

  @Column('text')
  name!: string;

  @Index()
  @Column('text')
  module!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('boolean', { default: true })
  active!: boolean;
}
