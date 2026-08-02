import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { SessionUser } from '@oa/contracts';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

interface JwtPayload {
  sub: string;
  credentialVersion?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: AuthService.jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<SessionUser> {
    if (!Number.isInteger(payload.credentialVersion)) {
      throw new UnauthorizedException('登录状态已失效，请重新登录');
    }
    return this.authService.getSessionUser(payload.sub, payload.credentialVersion);
  }
}
