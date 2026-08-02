import {
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateProcessDefinitionDto {
  @IsString()
  @Matches(/^[A-Za-z][A-Za-z0-9_]*$/)
  @MaxLength(64)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z][A-Za-z0-9_]*$/)
  @MaxLength(64)
  documentType?: string | null;

  @IsObject()
  designJson!: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeNote?: string | null;
}

export class CopyProcessVersionDto {
  @IsOptional()
  @IsUUID()
  sourceVersionId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeNote?: string | null;
}

export class UpdateProcessVersionDto {
  @IsOptional()
  @IsObject()
  designJson?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  changeNote?: string | null;
}
