import type { DocumentType } from '@oa/contracts';
import { requiredBusinessDocumentPermissions } from '@oa/contracts';
import { documentTypeMeta } from './document';

export interface ProcessStartItem {
  documentType: DocumentType;
  label: string;
  moduleLabel: string;
  path: string;
  description: string;
}

const processStartDetails: Record<DocumentType, Pick<ProcessStartItem, 'description'>> = {
  CONTRACT_REQUEST: {
    description: '用于合同签订或经营支出事项的事前请示，支持保存草稿后提交审批。',
  },
  CONTRACT_APPROVAL: {
    description: '登记合同主体、金额、相对方、签约内容与用印要求。',
  },
  CONTRACT_PAYMENT: {
    description: '关联已审批合同，登记付款批次、进度、金额、票据与付款原因。',
  },
  SEAL_BORROW: {
    description: '申请印章或证照外借，记录使用日期、归还日期、地点及陪同人员。',
  },
  SEAL_USE: {
    description: '申请现场用印或证照使用，审批通过后由印章管理员登记执行。',
  },
  MATERIAL_PURCHASE: {
    description: '按物资明细发起申购，自动计算参考单价与含税金额合计。',
  },
  MATERIAL_REQUISITION: {
    description: '从物资目录选择领用品项，审批通过后由仓库登记实际发放。',
  },
  PURCHASE_APPROVAL: {
    description: '登记采购名称、金额、乙方与期望到货时间，按角色链路逐级审批。',
  },
  PETTY_PROCUREMENT: {
    description: '从物资数据库勾选商品并填写数量，系统自动计算合计金额。',
  },
};

const documentOrder: DocumentType[] = [
  'CONTRACT_REQUEST',
  'CONTRACT_APPROVAL',
  'CONTRACT_PAYMENT',
  'SEAL_BORROW',
  'SEAL_USE',
  'MATERIAL_PURCHASE',
  'MATERIAL_REQUISITION',
];

export function availableProcessStarts(permissionCodes: string[]): ProcessStartItem[] {
  const granted = new Set(permissionCodes);
  return documentOrder
    .filter((documentType) =>
      requiredBusinessDocumentPermissions(documentType, 'CREATE').every((code) =>
        granted.has(code),
      ),
    )
    .map((documentType) => ({
      documentType,
      label: documentTypeMeta[documentType].label,
      moduleLabel: documentTypeMeta[documentType].moduleLabel,
      path: documentTypeMeta[documentType].createPath,
      ...processStartDetails[documentType],
    }));
}
