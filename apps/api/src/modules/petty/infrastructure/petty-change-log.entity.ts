import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('petty_change_logs')
export class PettyChangeLogEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text')
  procurementId!: string;

  @Column('text')
  actorId!: string;

  @Column('text')
  actorName!: string;

  @Column('text')
  action!: string;

  @Column('text')
  detail!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
