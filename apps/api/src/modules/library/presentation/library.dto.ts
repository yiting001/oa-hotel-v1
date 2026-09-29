import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { LIBRARY_CATEGORIES } from '../infrastructure/library-document.entity';

const CATEGORY_VALUES = [...LIBRARY_CATEGORIES];

export class LibraryListQueryDto {
  @IsOptional()
  @IsIn(CATEGORY_VALUES)
  category?: (typeof CATEGORY_VALUES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  keyword?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;
}

export class LibraryUploadDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsIn(CATEGORY_VALUES)
  category?: (typeof CATEGORY_VALUES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
