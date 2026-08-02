import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('iam_roles')
export class RoleEntity {
  @PrimaryColumn('text')
  id!: string;

  @Index({ unique: true })
  @Column('text')
  code!: string;

  @Column('text')
  name!: string;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column('boolean', { default: true })
  active!: boolean;
}
