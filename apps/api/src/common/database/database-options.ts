import type Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { BetterSqlite3ConnectionOptions } from 'typeorm/driver/better-sqlite3/BetterSqlite3ConnectionOptions';
import { InitialSchema1783764567016 } from './migrations/1783764567016-InitialSchema';
import { WorkflowEnterpriseFoundation1783944000200 } from './migrations/1783944000200-WorkflowEnterpriseFoundation';
import { IamOrganizationAccess1784000000000 } from './migrations/1784000000000-IamOrganizationAccess';
import { BusinessModulePermissions1784100000000 } from './migrations/1784100000000-BusinessModulePermissions';
import { databaseEntities } from './entities';
import { FormDesign1783944000001 } from '../form-design/infrastructure/migrations/1783944000001-FormDesign';
import { ProcessDesign1783944000002 } from '../process-design/infrastructure/migrations/1783944000002-ProcessDesign';
import { PortalReadModel1784200000000 } from '../../modules/portal/infrastructure/migrations/1784200000000-PortalReadModel';
import { PortalContentOperations1784300000000 } from '../../modules/portal/infrastructure/migrations/1784300000000-PortalContentOperations';
import { WorkbenchAdvancedCapabilities1784400000000 } from './migrations/1784400000000-WorkbenchAdvancedCapabilities';
import { UserCredentialLifecycle1784500000000 } from './migrations/1784500000000-UserCredentialLifecycle';
import { PersistentLoginAttemptLimiter1784600000000 } from './migrations/1784600000000-PersistentLoginAttemptLimiter';
import { RosterOptionalPasswordChange1784700000000 } from './migrations/1784700000000-RosterOptionalPasswordChange';
import { ProcurementApprovalFoundation1784800000000 } from './migrations/1784800000000-ProcurementApprovalFoundation';
import { ContractApprovalProcurementFields1784900000000 } from './migrations/1784900000000-ContractApprovalProcurementFields';

interface DatabaseOptionOverrides {
  migrationsRun?: boolean;
  readonly?: boolean;
}

export function createDatabaseOptions(
  overrides: DatabaseOptionOverrides = {},
): BetterSqlite3ConnectionOptions {
  const configured = process.env.OA_DATABASE_PATH ?? 'data/oa.sqlite';
  const database = configured === ':memory:' ? configured : resolve(process.cwd(), configured);
  if (database !== ':memory:' && !overrides.readonly) {
    mkdirSync(dirname(database), { recursive: true });
  }
  return {
    type: 'better-sqlite3',
    database,
    readonly: overrides.readonly ?? false,
    fileMustExist: overrides.readonly && database !== ':memory:' ? true : undefined,
    entities: databaseEntities,
    migrations: [
      InitialSchema1783764567016,
      FormDesign1783944000001,
      ProcessDesign1783944000002,
      WorkflowEnterpriseFoundation1783944000200,
      IamOrganizationAccess1784000000000,
      BusinessModulePermissions1784100000000,
      PortalReadModel1784200000000,
      PortalContentOperations1784300000000,
      WorkbenchAdvancedCapabilities1784400000000,
      UserCredentialLifecycle1784500000000,
      PersistentLoginAttemptLimiter1784600000000,
      RosterOptionalPasswordChange1784700000000,
      ProcurementApprovalFoundation1784800000000,
      ContractApprovalProcurementFields1784900000000,
    ],
    migrationsRun: overrides.migrationsRun ?? true,
    synchronize: false,
    prepareDatabase: (connection: Database.Database) => {
      connection.pragma('foreign_keys = ON');
      if (database !== ':memory:' && !overrides.readonly) {
        connection.pragma('journal_mode = WAL');
      }
    },
  };
}
