import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { DataScope } from '../domain/data-scope';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateRoleDto {
  @Transform(trim)
  @IsString()
  @Matches(/^[A-Z][A-Z0-9_]*$/, { message: '角色编码只能使用大写字母、数字和下划线' })
  @MaxLength(60)
  code!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  description?: string | null;
}

export class UpdateRoleDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @Transform(trim)
  @IsString()
  @MaxLength(300)
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateRoleMenusDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  hiddenMenuIds!: string[];
}

export class UpdateRolePermissionsDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionIds!: string[];
}

export class MembershipAssignmentDto {
  @IsString()
  @MaxLength(100)
  departmentId!: string;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(100)
  positionId?: string | null;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @IsBoolean()
  isDepartmentHead?: boolean;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class RoleAssignmentDto {
  @IsString()
  @MaxLength(100)
  roleId!: string;

  @IsEnum(DataScope)
  dataScope!: DataScope;

  @IsOptional()
  @ValidateIf((_object, value) => value !== null)
  @IsString()
  @MaxLength(100)
  scopeDepartmentId?: string | null;
}

export class UpdateUserAssignmentsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => MembershipAssignmentDto)
  memberships!: MembershipAssignmentDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleAssignmentDto)
  roles!: RoleAssignmentDto[];
}
