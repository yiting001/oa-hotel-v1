import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('seal_assets')
export class SealAssetEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text', { unique: true })
  code!: string;

  @Column('text')
  name!: string;

  @Column('text')
  type!: string;

  @Column('text')
  custodianUserId!: string;

  @Column('text', { default: 'AVAILABLE' })
  status!: string;

  @Column('text', { nullable: true })
  activeBorrowRequestId!: string | null;

  @Column('text', { nullable: true })
  validUntil!: string | null;
}
