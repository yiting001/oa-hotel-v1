import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestLogEntity } from './request-log.entity';
import { RequestLogService } from './request-log.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([RequestLogEntity])],
  providers: [RequestLogService],
  exports: [RequestLogService],
})
export class RequestLogModule {}
