import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

/** API 请求级日志：traceId、出参入参、耗时与错误栈，用于问题排查。 */
@Entity({ name: 'request_logs' })
export class RequestLogEntity {
  @PrimaryColumn({ type: 'text' })
  id!: string;

  @Index()
  @Column({ type: 'text', name: 'trace_id' })
  traceId!: string;

  @Column({ type: 'text' })
  method!: string;

  @Index()
  @Column({ type: 'text' })
  path!: string;

  @Column({ type: 'text', nullable: true })
  query!: string | null;

  @Column({ type: 'integer', name: 'status_code' })
  statusCode!: number;

  @Column({ type: 'integer', name: 'duration_ms' })
  durationMs!: number;

  @Column({ type: 'text', name: 'actor_id', nullable: true })
  actorId!: string | null;

  @Column({ type: 'text', name: 'actor_name', nullable: true })
  actorName!: string | null;

  @Column({ type: 'text', name: 'request_body', nullable: true })
  requestBody!: string | null;

  @Column({ type: 'text', name: 'response_body', nullable: true })
  responseBody!: string | null;

  @Column({ type: 'text', name: 'error_message', nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'text', name: 'error_stack', nullable: true })
  errorStack!: string | null;

  @Index()
  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
