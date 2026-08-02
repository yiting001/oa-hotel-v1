import {
  PORTAL_CONTENT_CATEGORIES,
  PORTAL_CONTENT_STATUSES,
  type PortalAudienceType,
  type PortalContentCategory,
  type PortalContentStatus,
} from '@oa/contracts';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const audienceTypes: PortalAudienceType[] = ['ALL', 'DEPARTMENT', 'ROLE', 'USER'];

export class PortalContentWriteDto {
  @IsOptional()
  @IsIn(PORTAL_CONTENT_CATEGORIES)
  category?: PortalContentCategory;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100_000)
  body?: string;

  @IsOptional()
  @IsIn(audienceTypes)
  audienceType?: PortalAudienceType;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  audienceIds?: string[];

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresReceipt?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2_000)
  coverImageUrl?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  attachments?: string[];

  @IsOptional()
  @IsISO8601()
  offlineAt?: string | null;
}

export class PortalContentPublishDto {
  @IsOptional()
  @IsISO8601()
  publishAt?: string | null;
}

export class PortalContentAdminQueryDto {
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

  @IsOptional()
  @IsIn(PORTAL_CONTENT_STATUSES)
  status?: PortalContentStatus;

  @IsOptional()
  @IsIn(PORTAL_CONTENT_CATEGORIES)
  category?: PortalContentCategory;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  keyword?: string;
}
