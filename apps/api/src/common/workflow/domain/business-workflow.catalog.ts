import type { DocumentType } from '@oa/contracts';

export interface BusinessWorkflowDefinition {
  legacyCode: string;
  processCode: string;
  documentType: DocumentType;
  name: string;
  approvalRoles: readonly string[];
}

/** Single source of truth for the approval order of the seven implemented document types. */
export const BUSINESS_WORKFLOW_CATALOG = [
  workflow('contract-request', 'CONTRACT_EXPENSE_REQUEST', 'CONTRACT_REQUEST', '合同/支出请示', [
    'DEPARTMENT_MANAGER',
    'FINANCE_REVIEWER',
  ]),
  workflow('contract-approval', 'CONTRACT_APPROVAL_PROCESS', 'CONTRACT_APPROVAL', '合同审批', [
    'DEPARTMENT_MANAGER',
    'FINANCE_REVIEWER',
    'OFFICE_REVIEWER',
  ]),
  workflow('contract-payment', 'CONTRACT_PAYMENT_PROCESS', 'CONTRACT_PAYMENT', '合同付款', [
    'DEPARTMENT_MANAGER',
    'FINANCE_REVIEWER',
  ]),
  workflow('seal-borrow', 'SEAL_BORROW_PROCESS', 'SEAL_BORROW', '印章证照外借', [
    'DEPARTMENT_MANAGER',
    'OFFICE_REVIEWER',
    'SEAL_MANAGER',
  ]),
  workflow('seal-use', 'SEAL_USE_PROCESS', 'SEAL_USE', '印章证照使用', [
    'DEPARTMENT_MANAGER',
    'OFFICE_REVIEWER',
    'SEAL_MANAGER',
  ]),
  workflow('material-purchase', 'MATERIAL_PURCHASE_PROCESS', 'MATERIAL_PURCHASE', '物资申购', [
    'DEPARTMENT_MANAGER',
    'PROCUREMENT',
    'FINANCE_REVIEWER',
  ]),
  workflow(
    'material-requisition',
    'MATERIAL_REQUISITION_PROCESS',
    'MATERIAL_REQUISITION',
    '物资领用',
    ['DEPARTMENT_MANAGER', 'WAREHOUSE_MANAGER'],
  ),
] as const satisfies readonly BusinessWorkflowDefinition[];

function workflow(
  legacyCode: string,
  processCode: string,
  documentType: DocumentType,
  name: string,
  approvalRoles: readonly string[],
): BusinessWorkflowDefinition {
  return { legacyCode, processCode, documentType, name, approvalRoles };
}
