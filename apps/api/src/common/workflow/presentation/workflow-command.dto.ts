import { IsString, IsUUID, MaxLength } from 'class-validator';

export class SubmitDocumentDto {
  @IsUUID()
  requestId!: string;
}

export class CompleteTaskDto {
  @IsUUID()
  requestId!: string;

  @IsString()
  @MaxLength(1000)
  comment!: string;
}
