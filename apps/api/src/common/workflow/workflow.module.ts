import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentWorkflowService } from './application/document-workflow.service';
import { DocumentIndexEntity } from './infrastructure/document-index.entity';
import { WorkflowCommandEntity } from './infrastructure/workflow-command.entity';
import { WorkflowDefinitionEntity } from './infrastructure/workflow-definition.entity';
import { WorkflowOpinionEntity } from './infrastructure/workflow-opinion.entity';
import { WorkflowTaskEntity } from './infrastructure/workflow-task.entity';
import { WorkflowController } from './presentation/workflow.controller';

const entities = [
  DocumentIndexEntity,
  WorkflowDefinitionEntity,
  WorkflowTaskEntity,
  WorkflowOpinionEntity,
  WorkflowCommandEntity,
];

@Module({
  imports: [TypeOrmModule.forFeature(entities)],
  controllers: [WorkflowController],
  providers: [DocumentWorkflowService],
  exports: [DocumentWorkflowService, TypeOrmModule],
})
export class WorkflowModule {}
