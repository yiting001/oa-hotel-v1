import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BUSINESS_MODULE_PERMISSIONS, type SessionUser } from '@oa/contracts';
import { CurrentUser } from '../../../common/auth/current-user.decorator';
import { DomainError } from '../../../common/errors/domain-error';
import {
  decodeMultipartFileName,
  MAX_UPLOAD_FILE_BYTES,
} from '../../../common/storage/file-storage';
import { RequirePermissions } from '../../../common/auth/required-permissions.decorator';
import { PurchaseApplicationService } from '../application/purchase-application.service';
import { PurchaseApprovalDto, PurchaseDto } from './purchase.dto';

const permission = BUSINESS_MODULE_PERMISSIONS.PURCHASE;

interface UploadedAttachmentFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('purchases')
export class PurchaseController {
  constructor(
    @Inject(PurchaseApplicationService) private readonly service: PurchaseApplicationService,
  ) {}

  @Post()
  @RequirePermissions('DOCUMENT_CREATE', permission.CREATE)
  create(@Body() dto: PurchaseDto, @CurrentUser() user: SessionUser) {
    return this.service.save(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('DOCUMENT_CREATE', permission.CREATE)
  update(@Param('id') id: string, @Body() dto: PurchaseDto, @CurrentUser() user: SessionUser) {
    return this.service.save(dto, user, id);
  }

  @Get(':id')
  @RequirePermissions('DOCUMENT_VIEW', permission.VIEW)
  get(@Param('id') id: string, @CurrentUser() user: SessionUser) {
    return this.service.get(id, user);
  }

  /** 采购经办在审批节点上传附件。 */
  @Post(':id/approval/attachments')
  @RequirePermissions('DOCUMENT_VIEW', permission.VIEW)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_FILE_BYTES } }))
  async uploadApprovalAttachment(
    @Param('id') id: string,
    @UploadedFile() file: UploadedAttachmentFile | undefined,
    @CurrentUser() user: SessionUser,
  ) {
    if (!file) {
      throw new DomainError('ATTACHMENT_FILE_REQUIRED', '请选择要上传的文件');
    }
    const saved = await this.service.uploadApprovalAttachment(
      id,
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

  /** 采购经办在当前审批节点补充单价和附件。 */
  @Put(':id/approval')
  @RequirePermissions('DOCUMENT_VIEW', permission.VIEW)
  updateApproval(
    @Param('id') id: string,
    @Body() dto: PurchaseApprovalDto,
    @CurrentUser() user: SessionUser,
  ) {
    return this.service.updateApproval(id, dto, user);
  }
}
