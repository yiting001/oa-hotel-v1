import type { DocumentType } from '@oa/contracts';
import type { PublishedAssigneeRule } from '../../process-design/domain/process-design.types';

export interface BusinessChoiceOption {
  id: string;
  name: string;
  assigneeRule: PublishedAssigneeRule;
}

export interface BusinessWorkflowDefinition {
  legacyCode: string;
  processCode: string;
  documentType: DocumentType;
  name: string;
  approvalRoles: readonly string[];
  /**
   * 「人工选择下一步」节点：该角色办理时可以勾选下列审核方。
   * 默认审核方办结后回到本节点，由办理人继续选择或送下一节点；
   * advanceAfterBranches 为 true 时直接进入下一审批节点。
   */
  manualChoice?: {
    roleCode: string;
    options: readonly BusinessChoiceOption[];
    advanceAfterBranches?: boolean;
  };
}

/** 合同审批中行政办公室可指派的兄弟部门（按部门名称解析部门负责人）。 */
const BROTHER_DEPARTMENT_OPTIONS: readonly BusinessChoiceOption[] = [
  {
    id: 'external-lawyer',
    name: '外部律师审核',
    assigneeRule: { type: 'ROLE', roleCode: 'LEGAL_ADVISOR' },
  },
  { id: 'engineering', name: '工程部审核', assigneeRule: { type: 'DEPARTMENT_MANAGER', departmentName: '工程部' } },
  { id: 'finance-dept', name: '财务部审核', assigneeRule: { type: 'DEPARTMENT_MANAGER', departmentName: '财务部' } },
  { id: 'sales', name: '销售部审核', assigneeRule: { type: 'DEPARTMENT_MANAGER', departmentName: '销售部' } },
  { id: 'front-office', name: '前厅部审核', assigneeRule: { type: 'DEPARTMENT_MANAGER', departmentName: '前厅部' } },
  { id: 'housekeeping', name: '客房部审核', assigneeRule: { type: 'DEPARTMENT_MANAGER', departmentName: '客房部' } },
  { id: 'catering-dept', name: '餐饮部审核', assigneeRule: { type: 'DEPARTMENT_MANAGER', departmentName: '餐饮部' } },
  { id: 'security', name: '保卫部审核', assigneeRule: { type: 'DEPARTMENT_MANAGER', departmentName: '保卫部' } },
  { id: 'hr', name: '人力资源部审核', assigneeRule: { type: 'DEPARTMENT_MANAGER', departmentName: '人力资源部' } },
  { id: 'party-work', name: '党群工作部审核', assigneeRule: { type: 'DEPARTMENT_MANAGER', departmentName: '党群工作部' } },
  { id: 'procurement-dept', name: '采购部审核', assigneeRule: { type: 'DEPARTMENT_MANAGER', departmentName: '采购部' } },
];

/** 请示批复中办公室可指派的兄弟部门（不含外部律师）。 */
const DEPARTMENT_REVIEW_OPTIONS: readonly BusinessChoiceOption[] =
  BROTHER_DEPARTMENT_OPTIONS.filter((option) => option.id !== 'external-lawyer');

/** Single source of truth for the approval order of the implemented document types. */
export const BUSINESS_WORKFLOW_CATALOG = [
  // 请示批复：部门发起 → 部门负责人 → 办公室勾选下一步部门 → 该部门审核 → 主管领导
  workflow(
    'contract-request',
    'CONTRACT_EXPENSE_REQUEST',
    'CONTRACT_REQUEST',
    '请示批复',
    ['DEPARTMENT_MANAGER', 'OFFICE_REVIEWER', 'EXEC_PRE_APPROVER'],
    {
      roleCode: 'OFFICE_REVIEWER',
      options: DEPARTMENT_REVIEW_OPTIONS,
      advanceAfterBranches: true,
    },
  ),
  workflow(
    'contract-approval',
    'CONTRACT_APPROVAL_PROCESS',
    'CONTRACT_APPROVAL',
    '合同审批',
    ['DEPARTMENT_MANAGER', 'ADMIN_APPROVER', 'EXEC_PRE_APPROVER', 'EXEC_APPROVER'],
    {
      roleCode: 'ADMIN_APPROVER',
      options: BROTHER_DEPARTMENT_OPTIONS,
    },
  ),
  // 采购审批：取消分管副总节点，由采购经办直接开始审核
  workflow('purchase-approval', 'PURCHASE_APPROVAL_PROCESS', 'PURCHASE_APPROVAL', '采购审批', [
    'PROCUREMENT',
    'FINANCE_REVIEWER',
    'FINANCE_EXEC',
    'EXEC_APPROVER',
  ]),
  workflow('petty-procurement', 'PETTY_PROCUREMENT_PROCESS', 'PETTY_PROCUREMENT', '零星采买', [
    'CATERING_APPROVER',
    'PROCUREMENT',
    'FINANCE_REVIEWER',
  ]),
  workflow('contract-payment', 'CONTRACT_PAYMENT_PROCESS', 'CONTRACT_PAYMENT', '合同付款', [
    'DEPARTMENT_MANAGER',
    'FINANCE_REVIEWER',
  ]),
  workflow('seal-borrow', 'SEAL_BORROW_PROCESS', 'SEAL_BORROW', '印章证照外借', [
    'OFFICE_REVIEWER',
    'EXEC_PRE_APPROVER',
    'EXEC_APPROVER',
  ]),
  workflow('seal-use', 'SEAL_USE_PROCESS', 'SEAL_USE', '印章证照使用', [
    'OFFICE_REVIEWER',
    'EXEC_PRE_APPROVER',
    'EXEC_APPROVER',
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
  // 食材采购：部门负责人 → 主管领导 → 总经理；明细可由审批领导删减调整。
  workflow('food-purchase', 'FOOD_PURCHASE_PROCESS', 'FOOD_PURCHASE', '食材采购', [
    'DEPARTMENT_MANAGER',
    'EXEC_PRE_APPROVER',
    'EXEC_APPROVER',
  ]),
  // 物资报损：部门负责人 → 财务审核 → 主管领导。
  workflow('material-loss', 'MATERIAL_LOSS_PROCESS', 'MATERIAL_LOSS', '物资报损', [
    'DEPARTMENT_MANAGER',
    'FINANCE_REVIEWER',
    'EXEC_PRE_APPROVER',
  ]),
  // 订单流转：部门负责人 → 主管领导，发起时选择抄送人。
  workflow(
    'order-circulation',
    'ORDER_CIRCULATION_PROCESS',
    'ORDER_CIRCULATION',
    '订单流转',
    ['DEPARTMENT_MANAGER', 'EXEC_PRE_APPROVER'],
  ),
] as const satisfies readonly BusinessWorkflowDefinition[];

function workflow(
  legacyCode: string,
  processCode: string,
  documentType: DocumentType,
  name: string,
  approvalRoles: readonly string[],
  manualChoice?: BusinessWorkflowDefinition['manualChoice'],
): BusinessWorkflowDefinition {
  return { legacyCode, processCode, documentType, name, approvalRoles, manualChoice };
}
