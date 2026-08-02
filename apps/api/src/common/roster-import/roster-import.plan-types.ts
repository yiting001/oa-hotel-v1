import type { DepartmentEntity } from '../auth/department.entity';
import type { UserEntity } from '../auth/user.entity';
import type { DataScope } from '../iam/domain/data-scope';
import type { DepartmentProfileEntity } from '../iam/infrastructure/department-profile.entity';
import type { MembershipEntity } from '../iam/infrastructure/membership.entity';
import type { PositionEntity } from '../iam/infrastructure/position.entity';
import type { UserRoleEntity } from '../iam/infrastructure/user-role.entity';
import type {
  NormalizedRosterPerson,
  RosterConflict,
  RosterImportSummary,
} from './roster-import.types';

export type RosterPlanAction = 'CREATE' | 'UPDATE' | 'REUSE' | 'REMOVE';

export interface PlannedDepartment {
  id: string;
  code: string;
  name: string;
  sortOrder: number;
  action: Exclude<RosterPlanAction, 'UPDATE' | 'REMOVE'>;
  existing: DepartmentEntity | null;
  profile: DepartmentProfileEntity | null;
}

export interface PlannedPosition {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  sortOrder: number;
  action: Exclude<RosterPlanAction, 'UPDATE' | 'REMOVE'>;
  existing: PositionEntity | null;
}

export interface PlannedUser {
  id: string;
  person: NormalizedRosterPerson;
  departmentId: string;
  positionId: string;
  requiredLegacyRoleCodes: string[];
  action: Exclude<RosterPlanAction, 'REMOVE'>;
  existing: UserEntity | null;
}

export interface PlannedMembership {
  id: string;
  userId: string;
  departmentId: string;
  positionId: string;
  isDepartmentHead: boolean;
  action: Exclude<RosterPlanAction, 'REMOVE'>;
  existing: MembershipEntity | null;
}

export interface PlannedRoleGrant {
  id: string;
  userId: string;
  roleId: string;
  dataScope: DataScope;
  scopeDepartmentId: string | null;
  action: RosterPlanAction;
  existing: UserRoleEntity | null;
}

export interface PlannedDepartmentManager {
  departmentId: string;
  managerUserId: string | null;
  action: Exclude<RosterPlanAction, 'CREATE' | 'REMOVE'>;
}

export interface RosterImportPlan {
  people: NormalizedRosterPerson[];
  departments: PlannedDepartment[];
  positions: PlannedPosition[];
  users: PlannedUser[];
  memberships: PlannedMembership[];
  roleGrants: PlannedRoleGrant[];
  departmentManagers: PlannedDepartmentManager[];
  conflicts: RosterConflict[];
  summary: RosterImportSummary;
}
