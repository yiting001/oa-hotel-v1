import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('petty_materials')
export class PettyMaterialEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text')
  name!: string;

  @Column('text')
  brand!: string;

  @Column('text', { default: '' })
  unit!: string;

  @Column('integer')
  unitPriceCents!: number;

  @Column('text')
  supplierName!: string;

  @Column('text', { nullable: true })
  supplierContact!: string | null;

  @Column('text', { nullable: true })
  supplierPhone!: string | null;

  @Column('boolean', { default: true })
  active!: boolean;
}
