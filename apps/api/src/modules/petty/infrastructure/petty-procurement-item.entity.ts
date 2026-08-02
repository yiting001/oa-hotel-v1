import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('petty_procurement_items')
export class PettyProcurementItemEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text')
  procurementId!: string;

  @Column('text')
  materialId!: string;

  @Column('text')
  name!: string;

  @Column('text')
  brand!: string;

  @Column('text', { default: '' })
  unit!: string;

  @Column('integer')
  unitPriceCents!: number;

  @Column('integer')
  quantity!: number;

  @Column('integer')
  subtotalCents!: number;
}
