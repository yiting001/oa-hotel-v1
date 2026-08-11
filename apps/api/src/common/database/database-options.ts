import type Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import type { BetterSqlite3ConnectionOptions } from 'typeorm/driver/better-sqlite3/BetterSqlite3ConnectionOptions';
import type { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { PostgresInitialSchema1785800000000 } from './migrations-postgres/1785800000000-PostgresInitialSchema';
import { PostgresInitialSeed1785800000001 } from './migrations-postgres/1785800000001-PostgresInitialSeed';
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
import { PurchaseModule1785000000000 } from './migrations/1785000000000-PurchaseModule';
import { PettyModule1785100000000 } from './migrations/1785100000000-PettyModule';
import { RoleMenuVisibility1785200000000 } from './migrations/1785200000000-RoleMenuVisibility';
import { MenuRbacV21785300000000 } from './migrations/1785300000000-MenuRbacV2';
import { RequestLogs1785400000000 } from './migrations/1785400000000-RequestLogs';
import { MenuReorganization1785500000000 } from './migrations/1785500000000-MenuReorganization';
import { MergeApprovalChainMenu1785600000000 } from './migrations/1785600000000-MergeApprovalChainMenu';
import { ApprovalCenterPath1785700000000 } from './migrations/1785700000000-ApprovalCenterPath';
import { HotelApprovalChainAdjustment1785900000000 } from './migrations/1785900000000-HotelApprovalChainAdjustment';
import { PostgresHotelApprovalChainAdjustment1785900000001 } from './migrations-postgres/1785900000001-PostgresHotelApprovalChainAdjustment';
import { PurchaseFinanceExecStep1786000000000 } from './migrations/1786000000000-PurchaseFinanceExecStep';
import { PostgresPurchaseFinanceExecStep1786000000001 } from './migrations-postgres/1786000000001-PostgresPurchaseFinanceExecStep';

interface DatabaseOptionOverrides {
  migrationsRun?: boolean;
  readonly?: boolean;
}

export type OaDatabaseOptions = BetterSqlite3ConnectionOptions | PostgresConnectionOptions;

export function createDatabaseOptions(overrides: DatabaseOptionOverrides = {}): OaDatabaseOptions {
  const databaseUrl = process.env.OA_DATABASE_URL;
  if (databaseUrl && /^postgres(ql)?:\/\//.test(databaseUrl)) {
    return {
      type: 'postgres',
      url: databaseUrl,
      entities: databaseEntities,
      migrations: [
        PostgresInitialSchema1785800000000,
        PostgresInitialSeed1785800000001,
        PostgresHotelApprovalChainAdjustment1785900000001,
        PostgresPurchaseFinanceExecStep1786000000001,
      ],
      migrationsRun: overrides.migrationsRun ?? true,
      synchronize: false,
    };
  }
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
      PurchaseModule1785000000000,
      PettyModule1785100000000,
      RoleMenuVisibility1785200000000,
      MenuRbacV21785300000000,
      RequestLogs1785400000000,
      MenuReorganization1785500000000,
      MergeApprovalChainMenu1785600000000,
      ApprovalCenterPath1785700000000,
      HotelApprovalChainAdjustment1785900000000,
      PurchaseFinanceExecStep1786000000000,
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
