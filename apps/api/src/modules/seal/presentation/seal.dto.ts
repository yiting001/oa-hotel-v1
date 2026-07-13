import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

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
  sealAssetIds!: string[];

  @IsString()
  @MaxLength(5000)
  content!: string;

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
  sealAssetIds!: string[];

  @IsString()
  @MaxLength(5000)
  content!: string;

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
