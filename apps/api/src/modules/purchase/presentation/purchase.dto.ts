import {
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class PurchaseDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsInt()
  @Min(0)
  amountCents!: number;

  @IsString()
  @MaxLength(300)
  counterpartyName!: string;

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

  @IsArray()
  @IsString({ each: true })
  attachments!: string[];
}
