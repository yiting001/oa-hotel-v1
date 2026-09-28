import { ArrayMaxSize, IsArray, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

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

  /** 人工选择下一步时勾选的审核方 ID；不传表示直接送下一节点。 */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  choices?: string[];
}
