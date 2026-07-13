import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('departments')
export class DepartmentEntity {
  @PrimaryColumn('text')
  id!: string;

  @Column('text', { unique: true })
  code!: string;

  @Column('text')
  name!: string;

  @Column('text', { nullable: true })
  managerUserId!: string | null;
}
