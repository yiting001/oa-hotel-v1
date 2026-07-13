import type Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { BetterSqlite3ConnectionOptions } from 'typeorm/driver/better-sqlite3/BetterSqlite3ConnectionOptions';
import { InitialSchema1783764567016 } from './migrations/1783764567016-InitialSchema';
import { databaseEntities } from './entities';

export function createDatabaseOptions(): BetterSqlite3ConnectionOptions {
  const configured = process.env.OA_DATABASE_PATH ?? 'data/oa.sqlite';
  const database = configured === ':memory:' ? configured : resolve(process.cwd(), configured);
  if (database !== ':memory:') {
    mkdirSync(dirname(database), { recursive: true });
  }
  return {
    type: 'better-sqlite3',
    database,
    entities: databaseEntities,
    migrations: [InitialSchema1783764567016],
    migrationsRun: true,
    synchronize: false,
    prepareDatabase: (connection: Database.Database) => {
      connection.pragma('foreign_keys = ON');
      if (database !== ':memory:') {
        connection.pragma('journal_mode = WAL');
      }
    },
  };
}
