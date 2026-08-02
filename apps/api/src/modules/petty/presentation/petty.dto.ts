import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class PettyMaterialDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsString()
  @MaxLength(100)
  brand!: string;

  @IsString()
  @MaxLength(20)
  unit!: string;

  @IsInt()
  @Min(0)
  unitPriceCents!: number;

  @IsString()
  @MaxLength(300)
  supplierName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  supplierContact!: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  supplierPhone!: string | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class PettyMaterialImportDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PettyMaterialDto)
  materials!: PettyMaterialDto[];
}

export class PettyProcurementItemDto {
  @IsString()
  materialId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class PettyProcurementDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remark!: string | null;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PettyProcurementItemDto)
  items!: PettyProcurementItemDto[];

  @IsArray()
  @IsString({ each: true })
  attachments!: string[];
}

export class PettyItemQuantityDto {
  @IsInt()
  @Min(1)
  quantity!: number;
}
