import type { DocumentAttachmentItem } from '@oa/contracts';
import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { IsDocumentAttachmentList } from '../../../common/validation/document-attachment.decorator';

export class OrderCirculationDto {
  @IsOptional()
  @IsDateString()
  applicationDate?: string | null;

  /** 单子主要内容即可，具体内容看附件。 */
  @IsString()
  @MaxLength(200)
  subject!: string;

  @IsString()
  @MaxLength(5000)
  content!: string;

  /** 抄送人（从可抄送人员中选择）。 */
  @IsArray()
  @IsString({ each: true })
  ccUserIds!: string[];

  @IsDocumentAttachmentList()
  attachments!: DocumentAttachmentItem[];
}
