import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/** 审批领导调整食材明细的变更记录。 */
@Entity('food_purchase_change_logs')
export class FoodPurchaseChangeLogEntity {
  @PrimaryColumn('text')
  id!: string;

  @Index()
  @Column('text')
  purchaseId!: string;

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
