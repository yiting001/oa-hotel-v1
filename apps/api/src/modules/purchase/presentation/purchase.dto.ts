import type { DocumentAttachmentItem } from '@oa/contracts';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { IsDocumentAttachmentList } from '../../../common/validation/document-attachment.decorator';

export class PurchaseItemDto {
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

  @IsInt()
  @Min(0)
  unitPriceCents!: number;
}

export class PurchaseDto {
  @IsOptional()
  @IsIn(['NON_STOCK', 'STOCK', 'ENGINEERING', 'FIXED_ASSET'])
  itemCategory?: string;

  @IsOptional()
  @IsIn(['NONE', 'BUDGET'])
  budgetType?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  tariffCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  vatCents?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  otherFeesCents?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  handlerName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  supplierA?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  supplierB?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  supplierC?: string;

  @IsOptional()
  @IsDateString()
  requiredDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  purchaseOrderNo?: string;

  /** 采购明细；提供时总价按明细与费用自动重算。 */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items?: PurchaseItemDto[];

  @IsString()
  @MaxLength(200)
  name!: string;

  /** 采购金额已从表单取消，保留字段兼容旧客户端与历史数据。 */
  @IsOptional()
  @IsInt()
  @Min(0)
  amountCents?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  counterpartyName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  counterpartyContact!: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  counterpartyPhone!: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  paymentMethod!: string | null;

  @IsOptional()
  @IsDateString()
  expectedDeliveryDate!: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remark!: string | null;

  @IsDocumentAttachmentList()
  attachments!: DocumentAttachmentItem[];
}

/** 采购经办在审批节点补充单价与附件。 */
export class PurchaseApprovalDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items!: PurchaseItemDto[];

  @IsDocumentAttachmentList()
  attachments!: DocumentAttachmentItem[];
}
