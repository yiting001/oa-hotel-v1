import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApprovalChainService } from './application/approval-chain.service';
import { DocumentNumberService } from './application/document-number.service';
import { DocumentWorkflowService } from './application/document-workflow.service';
import { DocumentPrintTemplateService } from './application/document-print-template.service';
import { WorkflowBatchApprovalService } from './application/workflow-batch-approval.service';
import { WorkflowCandidateService } from './application/workflow-candidate.service';
import { WorkflowCopyService } from './application/workflow-copy.service';
import { DocumentIndexEntity } from './infrastructure/document-index.entity';
import { WorkflowCommandEntity } from './infrastructure/workflow-command.entity';
import { WorkflowBatchCommandEntity } from './infrastructure/workflow-batch-command.entity';
import { WorkflowCopyEntity } from './infrastructure/workflow-copy.entity';
import { WorkflowDefinitionEntity } from './infrastructure/workflow-definition.entity';
import { WorkflowOpinionEntity } from './infrastructure/workflow-opinion.entity';
import { WorkflowTaskEntity } from './infrastructure/workflow-task.entity';
import { WorkflowTaskCandidateEntity } from './infrastructure/workflow-task-candidate.entity';
import { DocumentNumberSequenceEntity } from './infrastructure/document-number-sequence.entity';
import { ApprovalChainController } from './presentation/approval-chain.controller';
import { CompletedTasksController } from './presentation/completed-tasks.controller';
import { DocumentOverviewController } from './presentation/document-overview.controller';
import { WorkflowBatchApprovalController } from './presentation/workflow-batch-approval.controller';
import { WorkflowCopyController } from './presentation/workflow-copy.controller';
import { WorkflowController } from './presentation/workflow.controller';
import { IamModule } from '../iam/iam.module';
import { FormDesignModule } from '../form-design/form-design.module';
import { ProcessDesignModule } from '../process-design/process-design.module';
import { UserEntity } from '../auth/user.entity';
import { RoleEntity } from '../iam/infrastructure/role.entity';

const entities = [
  DocumentIndexEntity,
  WorkflowDefinitionEntity,
  WorkflowTaskEntity,
  WorkflowOpinionEntity,
  WorkflowCommandEntity,
  WorkflowBatchCommandEntity,
  WorkflowCopyEntity,
  WorkflowTaskCandidateEntity,
  DocumentNumberSequenceEntity,
  UserEntity,
  RoleEntity,
];

@Module({
  imports: [TypeOrmModule.forFeature(entities), IamModule, FormDesignModule, ProcessDesignModule],
  controllers: [
    ApprovalChainController,
    WorkflowController,
    WorkflowBatchApprovalController,
    WorkflowCopyController,
    CompletedTasksController,
    DocumentOverviewController,
  ],
  providers: [
    ApprovalChainService,
    DocumentNumberService,
    DocumentWorkflowService,
    DocumentPrintTemplateService,
    WorkflowCandidateService,
    WorkflowBatchApprovalService,
    WorkflowCopyService,
  ],
  exports: [DocumentWorkflowService, WorkflowCopyService, TypeOrmModule],
})
export class WorkflowModule {}
