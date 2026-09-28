import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class SealCategoryDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsInt()
  @Min(0)
  copies!: number;
}

export class SealBorrowDto {
  @IsDateString()
  useDate!: string;

  @IsDateString()
  plannedReturnDate!: string;

  @IsArray()
  @IsString({ each: true })
  companionIds!: string[];

  @IsString()
  @MaxLength(300)
  destination!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  sealAssetNames!: string[];

  @IsString()
  @MaxLength(5000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  submitTo?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SealCategoryDto)
  sealCategories?: SealCategoryDto[];

  @IsOptional()
  @IsBoolean()
  sealTakeout?: boolean;

  @IsOptional()
  @IsBoolean()
  licenseTakeout?: boolean;

  @IsArray()
  @IsString({ each: true })
  attachments!: string[];
}

export class SealUseDto {
  @IsDateString()
  useDate!: string;

  @IsString()
  @MaxLength(1000)
  purpose!: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @MaxLength(200, { each: true })
  sealAssetNames!: string[];

  @IsString()
  @MaxLength(5000)
  content!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  submitTo?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SealCategoryDto)
  sealCategories?: SealCategoryDto[];

  @IsOptional()
  @IsBoolean()
  sealTakeout?: boolean;

  @IsOptional()
  @IsBoolean()
  licenseTakeout?: boolean;

  @IsArray()
  @IsString({ each: true })
  attachments!: string[];
}

export class SealCheckoutDto {
  @IsString()
  actualRecipient!: string;

  @IsDateString()
  checkedOutAt!: string;
}

export class SealReturnDto {
  @IsDateString()
  returnedAt!: string;

  @IsString()
  returnCondition!: string;

  @IsOptional()
  @IsString()
  exceptionNote!: string | null;
}

export class SealExecuteDto {
  @IsInt()
  @Min(1)
  stampedCopies!: number;

  @IsDateString()
  executedAt!: string;

  @IsString()
  archiveNumber!: string;

  @IsOptional()
  @IsString()
  executionNote!: string | null;
}
