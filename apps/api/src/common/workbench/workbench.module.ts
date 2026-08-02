import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DepartmentEntity } from '../auth/department.entity';
import { UserEntity } from '../auth/user.entity';
import { DocumentIndexEntity } from '../workflow/infrastructure/document-index.entity';
import { WorkflowCopyEntity } from '../workflow/infrastructure/workflow-copy.entity';
import { WorkflowTaskCandidateEntity } from '../workflow/infrastructure/workflow-task-candidate.entity';
import { WorkflowTaskEntity } from '../workflow/infrastructure/workflow-task.entity';
import { WorkbenchQueryService } from './application/workbench-query.service';
import { DocumentFollowService } from './application/document-follow.service';
import { WORKBENCH_REPOSITORY } from './domain/workbench.repository';
import { TypeOrmWorkbenchRepository } from './infrastructure/typeorm-workbench.repository';
import { DocumentFollowEntity } from './infrastructure/document-follow.entity';
import { DocumentFollowController } from './presentation/document-follow.controller';
import { WorkbenchItemsController } from './presentation/workbench-items.controller';
import { WorkbenchSummaryController } from './presentation/workbench-summary.controller';
import { WorkflowModule } from '../workflow/workflow.module';
import { IamModule } from '../iam/iam.module';

@Module({
  imports: [
    WorkflowModule,
    IamModule,
    TypeOrmModule.forFeature([
      DocumentIndexEntity,
      DocumentFollowEntity,
      WorkflowCopyEntity,
      WorkflowTaskEntity,
      WorkflowTaskCandidateEntity,
      UserEntity,
      DepartmentEntity,
    ]),
  ],
  controllers: [WorkbenchSummaryController, WorkbenchItemsController, DocumentFollowController],
  providers: [
    WorkbenchQueryService,
    DocumentFollowService,
    { provide: WORKBENCH_REPOSITORY, useClass: TypeOrmWorkbenchRepository },
  ],
  exports: [WorkbenchQueryService, DocumentFollowService],
})
export class WorkbenchModule {}
