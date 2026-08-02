import { Column, Entity, Index, PrimaryColumn } from 'typeorm';
import { DATETIME_COLUMN_TYPE } from '../../../common/database/column-types';
import type { PortalReadReceipt } from '../domain/portal.types';

@Entity('portal_read_receipts')
@Index(['userId', 'readAt'])
export class PortalReadReceiptEntity implements PortalReadReceipt {
  @PrimaryColumn('text')
  contentId!: string;

  @PrimaryColumn('text')
  userId!: string;

  @Column(DATETIME_COLUMN_TYPE)
  readAt!: Date;
}
