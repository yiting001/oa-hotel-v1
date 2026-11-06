import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/** 物资报损明细。 */
@Entity('material_loss_items')
export class MaterialLossItemEntity {
  @PrimaryColumn('text')
  id!: string;

  @Index()
  @Column('text')
  lossId!: string;

  @Column('integer', { default: 0 })
  sortOrder!: number;

  @Column('text')
  name!: string;

  @Column('text', { default: '' })
  specification!: string;

  @Column('text', { default: '' })
  unit!: string;

  @Column('integer', { default: 1 })
  quantity!: number;

  @Column('integer', { nullable: true })
  unitPriceCents!: number | null;

  @Column('integer', { default: 0 })
  subtotalCents!: number;

  @Column('text', { default: '' })
  remark!: string;
}
