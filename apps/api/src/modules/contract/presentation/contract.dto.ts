import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class ContractRequestDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsDateString()
  requestedAt!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  amountCents!: number | null;

  @IsString()
  @MaxLength(5000)
  content!: string;

  @IsArray()
  @IsString({ each: true })
  attachments!: string[];
}

export class ContractApprovalDto {
  @IsOptional()
  @IsUUID()
  requestId!: string | null;

  @IsString()
  signingDepartmentId!: string;

  @IsDateString()
  signingDate!: string;

  @IsString()
  @MaxLength(200)
  name!: string;

  @IsInt()
  @Min(0)
  amountCents!: number;

  @IsString()
  @MaxLength(300)
  counterpartyFullName!: string;

  @IsString()
  @MaxLength(5000)
  contentReason!: string;

  @IsBoolean()
  needsSeal!: boolean;

  @IsArray()
  @IsString({ each: true })
  attachments!: string[];
}

export class ContractPaymentDto {
  @IsUUID()
  contractId!: string;

  @IsString()
  project!: string;

  @IsDateString()
  contractStartDate!: string;

  @IsDateString()
  contractEndDate!: string;

  @IsDateString()
  contractSigningDate!: string;

  @IsInt()
  @Min(0)
  contractAmountCents!: number;

  @IsInt()
  @Min(0)
  budgetAmountCents!: number;

  @IsInt()
  @Min(0)
  budgetExecutedCents!: number;

  @IsString()
  accountingSubject!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  maintenanceEstimateCents!: number | null;

  @IsString()
  counterpartyFullName!: string;

  @IsInt()
  @Min(1)
  plannedPaymentCount!: number;

  @IsInt()
  @Min(1)
  paymentSequence!: number;

  @IsInt()
  @Min(0)
  executedAmountCents!: number;

  @IsString()
  plannedProgress!: string;

  @IsString()
  actualProgress!: string;

  @IsIn(['CASH', 'CHEQUE', 'BANK_ACCEPTANCE', 'OTHER'])
  paymentMethod!: string;

  @IsString()
  @MaxLength(5000)
  paymentReason!: string;

  @IsOptional()
  @IsString()
  invoiceNumber!: string | null;

  @IsOptional()
  @IsDateString()
  warrantyStartDate!: string | null;

  @IsOptional()
  @IsDateString()
  warrantyEndDate!: string | null;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  paymentAmountCents!: number;

  @IsArray()
  @IsString({ each: true })
  attachments!: string[];
}
