import { DepartmentEntity } from '../auth/department.entity';
import { UserEntity } from '../auth/user.entity';
import { DocumentIndexEntity } from '../workflow/infrastructure/document-index.entity';
import { WorkflowCommandEntity } from '../workflow/infrastructure/workflow-command.entity';
import { WorkflowDefinitionEntity } from '../workflow/infrastructure/workflow-definition.entity';
import { WorkflowOpinionEntity } from '../workflow/infrastructure/workflow-opinion.entity';
import { WorkflowTaskEntity } from '../workflow/infrastructure/workflow-task.entity';
import { ContractEntity } from '../../modules/contract/infrastructure/contract.entity';
import { ContractPaymentEntity } from '../../modules/contract/infrastructure/contract-payment.entity';
import { ContractRequestEntity } from '../../modules/contract/infrastructure/contract-request.entity';
import { SealAssetEntity } from '../../modules/seal/infrastructure/seal-asset.entity';
import { SealBorrowEntity } from '../../modules/seal/infrastructure/seal-borrow.entity';
import { SealUseEntity } from '../../modules/seal/infrastructure/seal-use.entity';
import { MaterialItemEntity } from '../../modules/supply/infrastructure/material-item.entity';
import { MaterialPurchaseEntity } from '../../modules/supply/infrastructure/material-purchase.entity';
import { MaterialRequisitionEntity } from '../../modules/supply/infrastructure/material-requisition.entity';

export const databaseEntities = [
  DepartmentEntity,
  UserEntity,
  DocumentIndexEntity,
  WorkflowCommandEntity,
  WorkflowDefinitionEntity,
  WorkflowOpinionEntity,
  WorkflowTaskEntity,
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
