import type { DocumentAttachmentItem } from '@oa/contracts';

/** 保存时固化的抄送对象。 */
export interface OrderCcRecipient {
  id: string;
  name: string;
}

export interface OrderCirculationData {
  id: string;
  number: string;
  applicantId: string;
  departmentId: string;
  applicationDate: string;
  subject: string;
  content: string;
  ccRecipients: OrderCcRecipient[];
  attachments: DocumentAttachmentItem[];
}

export interface OrderCirculationPayload {
  applicationDate: string;
  subject: string;
  content: string;
  /** 抄送人用户 id，提交后由服务端转为抄送记录。 */
  ccUserIds: string[];
  attachments: DocumentAttachmentItem[];
}
