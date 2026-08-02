export interface RosterInputPerson {
  sourceSheet: string;
  sourceSequence: number;
  department: string;
  position: string;
  name: string;
}

export interface NormalizedRosterPerson extends RosterInputPerson {
  sourceKey: string;
  isDepartmentManager: boolean;
}

export type RosterConflictCode =
  | 'INPUT_INVALID'
  | 'SOURCE_DUPLICATE'
  | 'USERNAME_DUPLICATE'
  | 'DEPARTMENT_AMBIGUOUS'
  | 'DEPARTMENT_INACTIVE'
  | 'DEPARTMENT_ID_COLLISION'
  | 'DEPARTMENT_CODE_COLLISION'
  | 'POSITION_AMBIGUOUS'
  | 'POSITION_INACTIVE'
  | 'POSITION_ID_COLLISION'
  | 'POSITION_CODE_COLLISION'
  | 'USERNAME_CONFLICT'
  | 'USER_ID_COLLISION'
  | 'USER_INACTIVE'
  | 'MANAGER_AMBIGUOUS'
  | 'MEMBERSHIP_CONFLICT'
  | 'ROLE_MISSING'
  | 'ROLE_GRANT_CONFLICT'
  | 'CONCURRENT_CHANGE';

export interface RosterSourceReference {
  sheet: string;
  sequence: number;
}

export interface RosterConflict {
  code: RosterConflictCode;
  message: string;
  sources: RosterSourceReference[];
}

export interface RosterActionCounts {
  create: number;
  update: number;
  reuse: number;
  remove: number;
}

export interface RosterImportSummary {
  people: number;
  managers: number;
  departments: RosterActionCounts;
  positions: RosterActionCounts;
  users: RosterActionCounts;
  memberships: RosterActionCounts;
  roleGrants: RosterActionCounts;
  departmentManagers: RosterActionCounts;
}

export interface RosterImportReport {
  mode: 'DRY_RUN' | 'APPLY';
  applied: boolean;
  summary: RosterImportSummary;
  conflicts: RosterConflict[];
}

export class RosterImportConflictError extends Error {
  constructor(readonly report: RosterImportReport) {
    super('花名册预检失败，未写入任何数据');
    this.name = 'RosterImportConflictError';
  }
}

export function emptyActionCounts(): RosterActionCounts {
  return { create: 0, update: 0, reuse: 0, remove: 0 };
}
