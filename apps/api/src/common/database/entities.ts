import { DepartmentEntity } from '../auth/department.entity';
import { UserEntity } from '../auth/user.entity';
import { LoginAttemptStateEntity } from '../auth/login-attempt-state.entity';
import { DocumentIndexEntity } from '../workflow/infrastructure/document-index.entity';
import { WorkflowCommandEntity } from '../workflow/infrastructure/workflow-command.entity';
import { WorkflowDefinitionEntity } from '../workflow/infrastructure/workflow-definition.entity';
import { WorkflowOpinionEntity } from '../workflow/infrastructure/workflow-opinion.entity';
import { WorkflowTaskEntity } from '../workflow/infrastructure/workflow-task.entity';
import { WorkflowTaskCandidateEntity } from '../workflow/infrastructure/workflow-task-candidate.entity';
import { WorkflowBatchCommandEntity } from '../workflow/infrastructure/workflow-batch-command.entity';
import { WorkflowCopyEntity } from '../workflow/infrastructure/workflow-copy.entity';
import { DocumentFollowEntity } from '../workbench/infrastructure/document-follow.entity';
import { iamEntities } from '../iam/infrastructure/entities';
import { FormDefinitionEntity } from '../form-design/infrastructure/form-definition.entity';
import { FormVersionEntity } from '../form-design/infrastructure/form-version.entity';
import { ProcessDefinitionEntity } from '../process-design/infrastructure/process-definition.entity';
import { ProcessVersionEntity } from '../process-design/infrastructure/process-version.entity';
import { ContractEntity } from '../../modules/contract/infrastructure/contract.entity';
import { ContractPaymentEntity } from '../../modules/contract/infrastructure/contract-payment.entity';
import { ContractRequestEntity } from '../../modules/contract/infrastructure/contract-request.entity';
import { SealAssetEntity } from '../../modules/seal/infrastructure/seal-asset.entity';
import { SealBorrowEntity } from '../../modules/seal/infrastructure/seal-borrow.entity';
import { SealUseEntity } from '../../modules/seal/infrastructure/seal-use.entity';
import { MaterialItemEntity } from '../../modules/supply/infrastructure/material-item.entity';
import { MaterialPurchaseEntity } from '../../modules/supply/infrastructure/material-purchase.entity';
import { MaterialRequisitionEntity } from '../../modules/supply/infrastructure/material-requisition.entity';
import { portalEntities } from '../../modules/portal/infrastructure/entities';

export const databaseEntities = [
  DepartmentEntity,
  UserEntity,
  LoginAttemptStateEntity,
  DocumentIndexEntity,
  WorkflowCommandEntity,
  WorkflowDefinitionEntity,
  WorkflowOpinionEntity,
  WorkflowTaskEntity,
  WorkflowTaskCandidateEntity,
  WorkflowBatchCommandEntity,
  WorkflowCopyEntity,
  DocumentFollowEntity,
  FormDefinitionEntity,
  FormVersionEntity,
  ProcessDefinitionEntity,
  ProcessVersionEntity,
  ...iamEntities,
  ...portalEntities,
  ContractEntity,
  ContractPaymentEntity,
  ContractRequestEntity,
  SealAssetEntity,
  SealBorrowEntity,
  SealUseEntity,
  MaterialItemEntity,
  MaterialPurchaseEntity,
  MaterialRequisitionEntity,
];
