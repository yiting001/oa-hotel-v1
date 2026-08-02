import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { SessionUser } from '@oa/contracts';
import { requiredPermissionsKey } from './required-permissions.decorator';

interface AuthenticatedRequest {
  user?: SessionUser;
}

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(requiredPermissionsKey, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const permissions = new Set(request.user?.permissionCodes ?? []);
    if (required.every((code) => permissions.has(code))) {
      return true;
    }

    throw new ForbiddenException({
      code: 'PERMISSION_DENIED',
      message: '当前账号缺少所需功能权限',
      details: { required },
    });
  }
}
