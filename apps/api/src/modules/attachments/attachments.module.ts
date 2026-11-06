import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttachmentService } from './application/attachment.service';
import { DocumentAttachmentEntity } from './infrastructure/document-attachment.entity';
import { AttachmentsController } from './presentation/attachments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentAttachmentEntity])],
  controllers: [AttachmentsController],
  providers: [AttachmentService],
  exports: [AttachmentService],
})
export class AttachmentsModule {}
