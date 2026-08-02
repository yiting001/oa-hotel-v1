import { PORTAL_CONTENT_CATEGORIES, type PortalContentCategory } from '@oa/contracts';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class PortalContentListQueryDto {
  @IsIn(PORTAL_CONTENT_CATEGORIES)
  category!: PortalContentCategory;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
