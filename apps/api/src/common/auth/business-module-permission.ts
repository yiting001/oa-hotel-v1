import { ForbiddenException } from '@nestjs/common';
import {
  BUSINESS_MODULE_PERMISSIONS,
  requiredBusinessModulePermissions,
  type BusinessModule,
  type BusinessPermissionAction,
  type SessionUser,
} from '@oa/contracts';

const businessModules = Object.keys(BUSINESS_MODULE_PERMISSIONS) as BusinessModule[];

export function hasBusinessModulePermission(
  user: SessionUser,
  module: BusinessModule,
  action: BusinessPermissionAction,
): boolean {
  const granted = new Set(user.permissionCodes);
  return requiredBusinessModulePermissions(module, action).every((code) => granted.has(code));
}

export function allowedBusinessModules(
  user: SessionUser,
  action: BusinessPermissionAction,
): BusinessModule[] {
  return businessModules.filter((module) => hasBusinessModulePermission(user, module, action));
}

export function assertBusinessModulePermission(
  user: SessionUser,
  module: BusinessModule,
  action: BusinessPermissionAction,
): void {
  const required = requiredBusinessModulePermissions(module, action);
  if (hasBusinessModulePermission(user, module, action)) return;
  throw new ForbiddenException({
    code: 'BUSINESS_MODULE_PERMISSION_DENIED',
    message: '当前账号缺少该业务模块权限',
    details: { module, action, required },
  });
}

export function scopedBusinessPermission(
  module: BusinessModule,
  action: BusinessPermissionAction,
): string {
  return BUSINESS_MODULE_PERMISSIONS[module][action];
}
