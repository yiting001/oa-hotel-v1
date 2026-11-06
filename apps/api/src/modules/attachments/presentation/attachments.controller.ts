import {
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { SessionUser } from '@oa/contracts';
import type { Response } from 'express';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../../common/auth/required-permissions.decorator';
import { DomainError } from '../../../common/errors/domain-error';
import {
  contentDisposition,
  contentTypeHeader,
  decodeMultipartFileName,
  MAX_UPLOAD_FILE_BYTES,
} from '../../../common/storage/file-storage';
import { AttachmentService } from '../application/attachment.service';

interface UploadedAttachmentFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/** 单据附件上传与下载：上传返回 { id, fileName }，供单据附件字段引用。 */
@Controller('attachments')
export class AttachmentsController {
  constructor(@Inject(AttachmentService) private readonly attachments: AttachmentService) {}

  @Post()
  @RequirePermissions('DOCUMENT_CREATE')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_FILE_BYTES } }))
  async upload(
    @UploadedFile() file: UploadedAttachmentFile | undefined,
    @CurrentUser() user: SessionUser,
  ) {
    if (!file) {
      throw new DomainError('ATTACHMENT_FILE_REQUIRED', '请选择要上传的文件');
    }
    const saved = await this.attachments.upload(
      { fileName: decodeMultipartFileName(file.originalname), content: file.buffer },
      user,
    );
    return {
      id: saved.id,
      fileName: saved.fileName,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
    };
  }

  @Get(':id/download')
  @RequirePermissions('DOCUMENT_VIEW')
  async download(@Param('id') id: string, @Res() response: Response): Promise<void> {
    const { attachment, content } = await this.attachments.readContent(id);
    response.setHeader('Content-Type', contentTypeHeader(attachment.mimeType, false));
    response.setHeader('Content-Disposition', contentDisposition(attachment.fileName, false));
    response.setHeader('Content-Length', String(content.byteLength));
    response.end(content);
  }
}
