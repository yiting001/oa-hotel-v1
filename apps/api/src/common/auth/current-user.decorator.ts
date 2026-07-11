import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import type { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: SessionUser;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): SessionUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
