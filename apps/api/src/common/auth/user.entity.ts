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
}
