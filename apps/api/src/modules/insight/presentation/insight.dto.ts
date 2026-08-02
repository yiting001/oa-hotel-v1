import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class DocumentSearchQuery {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  keyword?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  applicant?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  documentType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  dateFrom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amountMinCents?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  amountMaxCents?: number;
}

export class OperationLogQuery {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  number?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  actor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  action?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  dateFrom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  dateTo?: string;
}

export class RequestLogQuery {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  traceId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  method?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  actor?: string;

  @IsOptional()
  @IsIn(['success', 'error'])
  status?: 'success' | 'error';

  @IsOptional()
  @IsString()
  @MaxLength(10)
  dateFrom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}

export class StatisticsQuery {
  @IsOptional()
  @IsIn(['day', 'week', 'month', 'year'])
  granularity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  dateFrom?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  dateTo?: string;
}
