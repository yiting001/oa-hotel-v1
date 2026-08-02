import type { DocumentStatus, DocumentType, WorkbenchBox } from '@oa/contracts';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class WorkbenchItemsQueryDto {
  @IsIn(['PENDING', 'COMPLETED', 'MINE', 'DRAFTS', 'FOLLOWING', 'COPIED'])
  box!: WorkbenchBox;

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
  @IsString()
  @MaxLength(100)
  keyword?: string;

  @IsOptional()
  @IsString()
  documentType?: DocumentType;

  @IsOptional()
  @IsString()
  applicantId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  status?: DocumentStatus;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateFrom?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateTo?: string;
}
