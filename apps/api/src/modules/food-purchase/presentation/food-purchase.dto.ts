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

export class FoodPurchaseItemDto {
  /** 品类可手填，也可以从拼音首字母下拉中选择。 */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

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

  /** 对应线下请购单的“要求”列。 */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  requirement?: string;

  /** 发起人可不填单价，审批领导后续补充。 */
  @IsOptional()
  @IsInt()
  @Min(0)
  unitPriceCents?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  remark?: string;
}

export class FoodPurchaseDto {
  @IsOptional()
  @IsDateString()
  applicationDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  teamName?: string;

  @IsArray({ message: '请至少填写一行采购明细' })
  @ArrayMinSize(1, { message: '请至少填写一行采购明细' })
  @ValidateNested({ each: true })
  @Type(() => FoodPurchaseItemDto)
  items!: FoodPurchaseItemDto[];

  @IsDocumentAttachmentList()
  attachments!: DocumentAttachmentItem[];
}

/** 审批领导调整明细时的整体替换载荷。 */
export class FoodPurchaseItemsDto {
  @IsArray({ message: '请至少填写一行采购明细' })
  @ArrayMinSize(1, { message: '请至少填写一行采购明细' })
  @ValidateNested({ each: true })
  @Type(() => FoodPurchaseItemDto)
  items!: FoodPurchaseItemDto[];
}
