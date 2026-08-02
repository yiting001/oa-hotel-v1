import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RequestLogs1785400000000 implements MigrationInterface {
  name = 'RequestLogs1785400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "request_logs" (
        "id" text PRIMARY KEY NOT NULL,
        "trace_id" text NOT NULL,
        "method" text NOT NULL,
        "path" text NOT NULL,
        "query" text,
        "status_code" integer NOT NULL,
        "duration_ms" integer NOT NULL,
        "actor_id" text,
        "actor_name" text,
        "request_body" text,
        "response_body" text,
        "error_message" text,
        "error_stack" text,
        "created_at" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX "idx_request_logs_trace_id" ON "request_logs" ("trace_id")`,
    );
    await queryRunner.query(`CREATE INDEX "idx_request_logs_path" ON "request_logs" ("path")`);
    await queryRunner.query(
      `CREATE INDEX "idx_request_logs_created_at" ON "request_logs" ("created_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "request_logs"`);
  }
}
