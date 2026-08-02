import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('document_number_sequences')
export class DocumentNumberSequenceEntity {
  @PrimaryColumn('text')
  prefix!: string;

  /** 发起日期的业务时区日键，格式 yyyyMMdd。 */
  @PrimaryColumn('text')
  dateKey!: string;

  @Column('integer', { default: 1 })
  nextSerial!: number;
}
