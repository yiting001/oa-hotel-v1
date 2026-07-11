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

export class PurchaseItemDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  brand!: string | null;

  @IsString()
  specification!: string;

  @IsString()
  unit!: string;

  @IsString()
  requestedQuantity!: string;

  @IsString()
  monthlyConsumption!: string;

  @IsInt()
  @Min(0)
  referenceUnitPriceCents!: number;

  @IsOptional()
  @IsString()
  remark!: string | null;
}

export class MaterialPurchaseDto {
  @IsDateString()
  applicationDate!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseItemDto)
  items!: PurchaseItemDto[];
}

export class RequisitionItemDto {
  @IsString()
  materialItemId!: string;

  @IsString()
  requestedQuantity!: string;

  @IsString()
  @MaxLength(500)
  purpose!: string;
}

export class MaterialRequisitionDto {
  @IsDateString()
  applicationDate!: string;

  @IsString()
  contactUserId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RequisitionItemDto)
  items!: RequisitionItemDto[];

  @IsArray()
  @IsString({ each: true })
  attachments!: string[];
}

export class IssuedItemDto {
  @IsString()
  materialItemId!: string;

  @IsString()
  issuedQuantity!: string;
}

export class IssueRequisitionDto {
  @IsDateString()
  issuedAt!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => IssuedItemDto)
  items!: IssuedItemDto[];
}
