import type { ContractApplicationService } from '../../modules/contract/application/contract-application.service';
import type { SealApplicationService } from '../../modules/seal/application/seal-application.service';
import type { SupplyApplicationService } from '../../modules/supply/application/supply-application.service';

type ContractRequestInput = Parameters<ContractApplicationService['saveRequest']>[0];
type ContractApprovalInput = Parameters<ContractApplicationService['saveContract']>[0];
type ContractPaymentInput = Parameters<ContractApplicationService['savePayment']>[0];
type SealUseInput = Parameters<SealApplicationService['saveUse']>[0];
type SealBorrowInput = Parameters<SealApplicationService['saveBorrow']>[0];
type MaterialPurchaseInput = Parameters<SupplyApplicationService['savePurchase']>[0];
type MaterialRequisitionInput = Parameters<SupplyApplicationService['saveRequisition']>[0];

export const DEMO_APPLICANT_USER_ID = 'user-applicant';

export const DEMO_MATERIAL_ITEM = {
  id: 'demo-material-guest-room-kit',
  code: 'DEMO-GUEST-ROOM-KIT',
  name: '[演示] 客房补充用品套装',
  specification: '牙具、梳子、浴帽组合装',
  unit: '套',
  availableQuantity: '500',
  active: true,
} as const;

export type DemoScenarioTarget =
  | { status: 'DRAFT' }
  | { status: 'IN_REVIEW'; currentStep: number }
  | { status: 'APPROVED' };

interface DemoScenarioBase {
  key: string;
  title: string;
  target: DemoScenarioTarget;
}

export type DemoScenario =
  | (DemoScenarioBase & { kind: 'CONTRACT_REQUEST'; payload: ContractRequestInput })
  | (DemoScenarioBase & { kind: 'CONTRACT_APPROVAL'; payload: ContractApprovalInput })
  | (DemoScenarioBase & {
      kind: 'CONTRACT_PAYMENT';
      contractScenarioKey: string;
      payload: Omit<ContractPaymentInput, 'contractId'>;
    })
  | (DemoScenarioBase & { kind: 'SEAL_USE'; payload: SealUseInput })
  | (DemoScenarioBase & { kind: 'SEAL_BORROW'; payload: SealBorrowInput })
  | (DemoScenarioBase & { kind: 'MATERIAL_PURCHASE'; payload: MaterialPurchaseInput })
  | (DemoScenarioBase & { kind: 'MATERIAL_REQUISITION'; payload: MaterialRequisitionInput });

/**
 * Each scenario stops at a deliberate workflow state so every demo role has useful read models.
 * Exact titles are stable idempotency markers and are also easy to recognize in the UI.
 */
export const DEMO_SCENARIOS = [
  {
    key: 'contract-request-draft',
    kind: 'CONTRACT_REQUEST',
    title: '[演示] 客房智能门锁升级立项请示',
    target: { status: 'DRAFT' },
    payload: {
      title: '[演示] 客房智能门锁升级立项请示',
      requestedAt: '2026-07-13',
      amountCents: 12800000,
      content: '升级客房门锁及后台管理终端，降低房卡故障率并补齐审计记录。',
      attachments: ['智能门锁升级方案.pdf', '供应商初步报价.xlsx'],
    },
  },
  {
    key: 'contract-request-manager-todo',
    kind: 'CONTRACT_REQUEST',
    title: '[演示] 夏季员工关怀物资预算请示',
    target: { status: 'IN_REVIEW', currentStep: 0 },
    payload: {
      title: '[演示] 夏季员工关怀物资预算请示',
      requestedAt: '2026-07-12',
      amountCents: 360000,
      content: '为高温岗位采购防暑用品和饮品，覆盖工程、礼宾及安保班组。',
      attachments: ['夏季关怀物资清单.xlsx'],
    },
  },
  {
    key: 'contract-request-finance-todo',
    kind: 'CONTRACT_REQUEST',
    title: '[演示] 消防设施年度检测费用请示',
    target: { status: 'IN_REVIEW', currentStep: 1 },
    payload: {
      title: '[演示] 消防设施年度检测费用请示',
      requestedAt: '2026-07-11',
      amountCents: 680000,
      content: '按年度计划完成消防报警、喷淋及应急照明系统检测并出具报告。',
      attachments: ['年度消防检测计划.pdf'],
    },
  },
  {
    key: 'contract-approval-approved',
    kind: 'CONTRACT_APPROVAL',
    title: '[演示] 2026年度电梯维保合同',
    target: { status: 'APPROVED' },
    payload: {
      requestId: null,
      signingDepartmentId: 'dept-business',
      signingDate: '2026-07-10',
      name: '[演示] 2026年度电梯维保合同',
      amountCents: 9600000,
      counterpartyFullName: '华东特种设备维护有限公司',
      counterpartyContact: '李工',
      counterpartyPhone: '021-88886666',
      paymentMethod: '银行转账',
      validFrom: '2026-07-01',
      validTo: '2027-06-30',
      contentReason: '覆盖酒店客梯、货梯的年度巡检、保养和应急响应。',
      remark: null,
      needsSeal: true,
      attachments: ['电梯维保合同终稿.pdf', '供应商资质.pdf'],
    },
  },
  {
    key: 'contract-payment-finance-todo',
    kind: 'CONTRACT_PAYMENT',
    contractScenarioKey: 'contract-approval-approved',
    title: '[演示] 2026年度电梯维保合同首期付款',
    target: { status: 'IN_REVIEW', currentStep: 1 },
    payload: {
      project: '[演示] 2026年度电梯维保合同首期付款',
      contractStartDate: '2026-07-01',
      contractEndDate: '2027-06-30',
      contractSigningDate: '2026-07-10',
      contractAmountCents: 9600000,
      budgetAmountCents: 9600000,
      budgetExecutedCents: 0,
      accountingSubject: '管理费用-维修保养费',
      maintenanceEstimateCents: 9600000,
      counterpartyFullName: '华东特种设备维护有限公司',
      plannedPaymentCount: 4,
      paymentSequence: 1,
      executedAmountCents: 0,
      plannedProgress: '25%',
      actualProgress: '25%',
      paymentMethod: 'BANK_ACCEPTANCE',
      paymentReason: '合同签订并完成首轮设备巡检后支付首期维保款。',
      invoiceNumber: 'DEMO-ELEVATOR-2026-001',
      warrantyStartDate: null,
      warrantyEndDate: null,
      paymentAmountCents: 2400000,
      attachments: ['首期付款申请.pdf', '维保巡检确认单.pdf'],
    },
  },
  {
    key: 'seal-use-office-todo',
    kind: 'SEAL_USE',
    title: '印章证照使用：[演示] 暑期招聘材料盖章',
    target: { status: 'IN_REVIEW', currentStep: 1 },
    payload: {
      useDate: '2026-07-15',
      purpose: '[演示] 暑期招聘材料盖章',
      sealAssetIds: ['seal-company'],
      content: '用于校企合作函、实习协议及招聘活动授权材料。',
      attachments: ['校企合作函.docx', '实习协议模板.pdf'],
    },
  },
  {
    key: 'seal-borrow-approved',
    kind: 'SEAL_BORROW',
    title: '印章证照外借：[演示] 市行政服务中心',
    target: { status: 'APPROVED' },
    payload: {
      useDate: '2026-07-16',
      plannedReturnDate: '2026-07-16',
      companionIds: ['user-office'],
      destination: '[演示] 市行政服务中心',
      sealAssetIds: ['license-business'],
      content: '办理酒店经营许可年度信息核验。',
      attachments: ['窗口办理材料清单.pdf'],
    },
  },
  {
    key: 'material-purchase-procurement-todo',
    kind: 'MATERIAL_PURCHASE',
    title: '物资申购：[演示] 客房雨伞等2项',
    target: { status: 'IN_REVIEW', currentStep: 1 },
    payload: {
      applicationDate: '2026-07-13',
      items: [
        {
          name: '[演示] 客房雨伞',
          brand: '酒店定制',
          specification: '24骨直杆伞',
          unit: '把',
          requestedQuantity: '80',
          monthlyConsumption: '12',
          referenceUnitPriceCents: 6800,
          remark: '补充客房借用库存',
        },
        {
          name: '行李牌',
          brand: null,
          specification: '防水合成纸',
          unit: '张',
          requestedQuantity: '1000',
          monthlyConsumption: '180',
          referenceUnitPriceCents: 120,
          remark: null,
        },
      ],
    },
  },
  {
    key: 'material-purchase-approved',
    kind: 'MATERIAL_PURCHASE',
    title: '物资申购：[演示] 餐饮部玻璃器皿等2项',
    target: { status: 'APPROVED' },
    payload: {
      applicationDate: '2026-07-10',
      items: [
        {
          name: '[演示] 餐饮部玻璃器皿',
          brand: '餐饮专用',
          specification: '高脚杯 350ml',
          unit: '只',
          requestedQuantity: '240',
          monthlyConsumption: '30',
          referenceUnitPriceCents: 2600,
          remark: '宴会厅开台补充',
        },
        {
          name: '不锈钢餐夹',
          brand: null,
          specification: '食品级 24cm',
          unit: '把',
          requestedQuantity: '60',
          monthlyConsumption: '8',
          referenceUnitPriceCents: 1800,
          remark: null,
        },
      ],
    },
  },
  {
    key: 'material-requisition-warehouse-todo',
    kind: 'MATERIAL_REQUISITION',
    title: '物资领用：[演示] 客房补充用品套装等1项',
    target: { status: 'IN_REVIEW', currentStep: 1 },
    payload: {
      applicationDate: '2026-07-13',
      contactUserId: 'user-applicant',
      items: [
        {
          materialItemId: DEMO_MATERIAL_ITEM.id,
          requestedQuantity: '36',
          purpose: '补充行政楼层客房周转库存。',
        },
      ],
      attachments: ['楼层补充计划.xlsx'],
    },
  },
] satisfies readonly DemoScenario[];
