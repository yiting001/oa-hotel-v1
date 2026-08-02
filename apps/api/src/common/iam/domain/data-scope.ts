export enum DataScope {
  SELF = 'SELF',
  DEPARTMENT = 'DEPARTMENT',
  DEPARTMENT_TREE = 'DEPARTMENT_TREE',
  ALL = 'ALL',
}

export interface DataScopeGrant {
  roleCode: string;
  permissionCodes: string[];
  scope: DataScope;
  scopeDepartmentId: string | null;
}
