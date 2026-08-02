import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { SessionUser } from '@oa/contracts';
import { allowPasswordChangeRequiredKey } from './allow-password-change-required.decorator';
import { IS_PUBLIC_KEY } from './public.decorator';

interface AuthenticatedRequest {
  user?: SessionUser;
}

@Injectable()
export class PasswordChangeRequiredGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets);
    const isRecoveryEndpoint = this.reflector.getAllAndOverride<boolean>(
      allowPasswordChangeRequiredKey,
      targets,
    );
    if (isPublic || isRecoveryEndpoint) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user?.passwordChangeRequired !== true) return true;

    throw new ForbiddenException({
      code: 'PASSWORD_CHANGE_REQUIRED',
      message: '首次登录必须修改初始密码',
    });
  }
}
