import { SetMetadata } from '@nestjs/common';

export const requiredPermissionsKey = 'required-permissions';

/** Declares the functional permissions required by an endpoint. */
export const RequirePermissions = (...permissionCodes: string[]) =>
  SetMetadata(requiredPermissionsKey, permissionCodes);
