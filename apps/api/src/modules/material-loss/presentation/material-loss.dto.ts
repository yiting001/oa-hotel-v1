import type { DocumentAttachmentItem } from '@oa/contracts';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsDocumentAttachmentList } from '../../../common/validation/document-attachment.decorator';

export class MaterialLossItemDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  specification?: string;

  @IsString()
  @MaxLength(20)
  unit!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  unitPriceCents?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  remark?: string;
}

export class MaterialLossDto {
  @IsOptional()
  @IsDateString()
  applicationDate?: string | null;

  @IsString()
  @MaxLength(1000)
  reason!: string;

  @IsArray({ message: '请至少填写一行报损明细' })
  @ArrayMinSize(1, { message: '请至少填写一行报损明细' })
  @ValidateNested({ each: true })
  @Type(() => MaterialLossItemDto)
  items!: MaterialLossItemDto[];

  @IsDocumentAttachmentList()
  attachments!: DocumentAttachmentItem[];
}
