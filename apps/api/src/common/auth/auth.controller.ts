import { Body, Controller, Get, Inject, Post } from '@nestjs/common';
import type { SessionUser } from '@oa/contracts';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './login.dto';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password);
  }

  @Get('me')
  me(@CurrentUser() user: SessionUser): SessionUser {
    return user;
  }

  @Get('users')
  users(): Promise<SessionUser[]> {
    return this.authService.listUsers();
  }

  @Get('departments')
  departments() {
    return this.authService.listDepartments();
  }
}
