import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('iam_memberships')
@Index(['userId', 'departmentId'])
export class MembershipEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text')
  userId!: string;

  @Column('text')
  departmentId!: string;

  @Column('text', { nullable: true })
  positionId!: string | null;

  @Column('boolean', { default: false })
  isPrimary!: boolean;

  @Column('boolean', { default: false })
  isDepartmentHead!: boolean;

  @Column('boolean', { default: true })
  active!: boolean;
}
