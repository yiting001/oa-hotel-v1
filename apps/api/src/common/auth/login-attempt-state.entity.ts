import { Check, Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { DATETIME_COLUMN_TYPE } from '../database/column-types';

@Entity('login_attempt_states')
@Index('IDX_login_attempt_expires_at', ['expiresAt'])
@Check('CHK_login_attempt_attempts_positive', '"attempts" > 0')
export class LoginAttemptStateEntity {
  @PrimaryColumn('text')
  username!: string;

  @Column('text')
  generation!: string;

  @Column('integer')
  attempts!: number;

  @Column(DATETIME_COLUMN_TYPE)
  expiresAt!: Date;

  @Column(DATETIME_COLUMN_TYPE)
  updatedAt!: Date;
}
