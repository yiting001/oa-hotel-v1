import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import type { SessionUser } from '@oa/contracts';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

interface JwtPayload {
  sub: string;
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
    return this.authService.getSessionUser(payload.sub);
  }
}
