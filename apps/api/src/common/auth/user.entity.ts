import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { DATETIME_COLUMN_TYPE } from '../database/column-types';

@Entity('users')
export class UserEntity {
  @PrimaryColumn('text')
  id!: string;

  @Index({ unique: true })
  @Column('text')
  username!: string;

  @Column('text')
  displayName!: string;

  /** 手机号：可作为登录账号使用，也可只是联系方式；未填写为 null。 */
  @Index({ unique: true })
  @Column('text', { nullable: true })
  phone!: string | null;

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

  @Column(DATETIME_COLUMN_TYPE, { nullable: true })
  passwordChangedAt?: Date | null;

  @Column('integer', { default: 0 })
  credentialVersion?: number;
}
