import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LibraryService } from './application/library.service';
import { LibraryDocumentEntity } from './infrastructure/library-document.entity';
import { LibraryController } from './presentation/library.controller';

@Module({
  imports: [TypeOrmModule.forFeature([LibraryDocumentEntity])],
  controllers: [LibraryController],
  providers: [LibraryService],
})
export class LibraryModule {}
