import { Body, Controller, Get, Inject, Post, Put } from '@nestjs/common';
import type { DirectoryUser, SessionUser } from '@oa/contracts';
import { AuthService } from './auth.service';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './login.dto';
import { Public } from './public.decorator';
import { RequirePermissions } from './required-permissions.decorator';
import { ChangePasswordDto } from './change-password.dto';
import { AllowPasswordChangeRequired } from './allow-password-change-required.decorator';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password);
  }

  @Get('me')
  @AllowPasswordChangeRequired()
  me(@CurrentUser() user: SessionUser): SessionUser {
    return user;
  }

  @Put('me/password')
  @AllowPasswordChangeRequired()
  changePassword(@CurrentUser() user: SessionUser, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(user.id, dto.currentPassword, dto.newPassword);
  }

  @Get('users')
  @RequirePermissions('DOCUMENT_VIEW')
  users(): Promise<DirectoryUser[]> {
    return this.authService.listUsers();
  }

  @Get('departments')
  @RequirePermissions('DOCUMENT_VIEW')
  departments() {
    return this.authService.listDepartments();
  }
}
