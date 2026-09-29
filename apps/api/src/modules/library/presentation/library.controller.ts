import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Query,
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
import { LibraryService } from '../application/library.service';
import {
  contentDisposition,
  contentTypeHeader,
  isInlinePreviewable,
  MAX_LIBRARY_FILE_BYTES,
} from '../domain/library-storage';
import { LibraryListQueryDto, LibraryUploadDto } from './library.dto';

/**
 * multipart 的文件名按 latin1 解析，中文会变成乱码；
 * 这里按 UTF-8 还原，还原失败时保留原值。
 */
function decodeMultipartFileName(value: string): string {
  const decoded = Buffer.from(value, 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? value : decoded;
}

interface UploadedLibraryFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('library')
export class LibraryController {
  constructor(@Inject(LibraryService) private readonly library: LibraryService) {}

  @Get('documents')
  @RequirePermissions('LIBRARY_VIEW')
  list(@Query() query: LibraryListQueryDto) {
    return this.library.list({
      category: query.category,
      keyword: query.keyword,
      page: query.page ?? 1,
      pageSize: Math.min(query.pageSize ?? 20, 100),
    });
  }

  @Post('documents')
  @RequirePermissions('LIBRARY_MANAGE')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_LIBRARY_FILE_BYTES } }))
  async upload(
    @UploadedFile() file: UploadedLibraryFile | undefined,
    @Body() dto: LibraryUploadDto,
    @CurrentUser() user: SessionUser,
  ) {
    if (!file) {
      throw new DomainError('LIBRARY_FILE_REQUIRED', '请选择要上传的文件');
    }
    return this.library.upload(
      {
        title: dto.title,
        category: dto.category ?? 'OTHER',
        description: dto.description ?? '',
        fileName: decodeMultipartFileName(file.originalname),
        content: file.buffer,
      },
      user,
    );
  }

  @Get('documents/:id/preview')
  @RequirePermissions('LIBRARY_VIEW')
  async preview(@Param('id') id: string, @Res() response: Response): Promise<void> {
    const { document, content } = await this.library.readContent(id, false);
    if (!isInlinePreviewable(document.mimeType)) {
      throw new DomainError('LIBRARY_PREVIEW_UNSUPPORTED', '该文件类型不支持在线预览，请下载后查看');
    }
    response.setHeader('Content-Type', contentTypeHeader(document.mimeType, true));
    response.setHeader('Content-Disposition', contentDisposition(document.fileName, true));
    response.setHeader('Content-Length', String(content.byteLength));
    response.end(content);
  }

  @Get('documents/:id/download')
  @RequirePermissions('LIBRARY_VIEW')
  async download(@Param('id') id: string, @Res() response: Response): Promise<void> {
    const { document, content } = await this.library.readContent(id, true);
    response.setHeader('Content-Type', contentTypeHeader(document.mimeType, false));
    response.setHeader('Content-Disposition', contentDisposition(document.fileName, false));
    response.setHeader('Content-Length', String(content.byteLength));
    response.end(content);
  }

  @Delete('documents/:id')
  @RequirePermissions('LIBRARY_MANAGE')
  async remove(@Param('id') id: string): Promise<{ id: string }> {
    await this.library.remove(id);
    return { id };
  }
}
