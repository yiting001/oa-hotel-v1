import type { PortalReadingStatus } from '@oa/contracts';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class PortalReadingQueryDto {
  @IsOptional()
  @IsIn(['ALL', 'UNREAD', 'READ'])
  status: PortalReadingStatus = 'ALL';

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
