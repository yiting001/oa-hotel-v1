import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class BatchApproveTasksDto {
  @IsUUID()
  requestId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  taskIds!: string[];

  @IsString()
  @MaxLength(1000)
  comment!: string;
}
