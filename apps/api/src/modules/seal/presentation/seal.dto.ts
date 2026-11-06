import type { DocumentAttachmentItem } from '@oa/contracts';
import { Transform, Type } from 'class-transformer';
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
import { IsDocumentAttachmentList } from '../../../common/validation/document-attachment.decorator';

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

  /** 不外带时留空（空字符串按未填写处理）。 */
  @Transform(({ value }) => (value === '' ? null : value))
  @IsOptional()
  @IsDateString()
  plannedReturnDate!: string | null;

  @IsArray()
  @IsString({ each: true })
  companionIds!: string[];

  /** 不外带时留空。 */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  destination?: string;

  @IsArray({ message: '请至少填写一项证照种类' })
  @ArrayMinSize(1, { message: '请至少填写一项证照种类' })
  @IsString({ each: true, message: '证照种类格式不正确' })
  @MaxLength(200, { each: true, message: '单项名称不能超过 200 个字符' })
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

  @IsDocumentAttachmentList()
  attachments!: DocumentAttachmentItem[];
}

export class SealUseDto {
  @IsDateString()
  useDate!: string;

  /** 公章外带时填写归还日期；不外带留空。 */
  @Transform(({ value }) => (value === '' ? null : value))
  @IsOptional()
  @IsDateString()
  plannedReturnDate?: string | null;

  @IsString()
  @MaxLength(1000)
  purpose!: string;

  @IsArray({ message: '请至少选择一项用章类别' })
  @ArrayMinSize(1, { message: '请至少选择一项用章类别' })
  @IsString({ each: true, message: '用章类别格式不正确' })
  @MaxLength(200, { each: true, message: '单项名称不能超过 200 个字符' })
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

  @IsDocumentAttachmentList()
  attachments!: DocumentAttachmentItem[];
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
