import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('material_items')
export class MaterialItemEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text', { unique: true })
  code!: string;

  @Column('text')
  name!: string;

  @Column('text')
  specification!: string;

  @Column('text')
  unit!: string;

  @Column('text')
  availableQuantity!: string;

  @Column('boolean', { default: true })
  active!: boolean;
}
