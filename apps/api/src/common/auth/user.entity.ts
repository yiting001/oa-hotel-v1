import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('users')
export class UserEntity {
  @PrimaryColumn('text')
  id!: string;

  @Index({ unique: true })
  @Column('text')
  username!: string;

  @Column('text')
  displayName!: string;

  @Column('text')
  passwordHash!: string;

  @Column('text')
  departmentId!: string;

  @Column('simple-json')
  roleCodes!: string[];

  @Column('boolean', { default: true })
  active!: boolean;

  @Column('boolean', { default: false })
  passwordChangeRequired?: boolean;

  @Column('datetime', { nullable: true })
  passwordChangedAt?: Date | null;

  @Column('integer', { default: 0 })
  credentialVersion?: number;
}
