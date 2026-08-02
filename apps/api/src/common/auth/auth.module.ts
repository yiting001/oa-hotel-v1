import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { DepartmentEntity } from './department.entity';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt.strategy';
import { UserEntity } from './user.entity';
import { IamModule } from '../iam/iam.module';
import { PermissionGuard } from './permission.guard';
import { PasswordChangeRequiredGuard } from './password-change-required.guard';
import { LoginAttemptLimiter } from './login-attempt-limiter.service';
import { LoginPasswordVerifier } from './login-password-verifier.service';
import { LoginAttemptStateEntity } from './login-attempt-state.entity';
import { LoginAttemptStateRepository } from './login-attempt-state.repository';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, DepartmentEntity, LoginAttemptStateEntity]),
    IamModule,
    PassportModule,
    JwtModule.register({
      secret: AuthService.jwtSecret,
      signOptions: { expiresIn: '8h' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LoginAttemptLimiter,
    LoginAttemptStateRepository,
    LoginPasswordVerifier,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PasswordChangeRequiredGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
