import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { credentialPolicy } from './credential-policy';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(credentialPolicy.loginPasswordMaxLength)
  currentPassword!: string;

  @ApiProperty({
    minLength: credentialPolicy.newPasswordMinLength,
    maxLength: credentialPolicy.newPasswordMaxLength,
  })
  @IsString()
  @MinLength(credentialPolicy.newPasswordMinLength)
  @MaxLength(credentialPolicy.newPasswordMaxLength)
  @Matches(/\S/, { message: '新密码不能全部为空白字符' })
  newPassword!: string;
}
