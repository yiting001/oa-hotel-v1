import type {
  PortalAdminContentDetail,
  PortalAudienceType,
  PortalContentCategory,
} from '@oa/contracts';
import { businessDateTimeInputValue } from '../../../../shared/business-time';

export interface PortalContentEditorForm {
  category: PortalContentCategory;
  title: string;
  summary: string;
  body: string;
  audienceType: PortalAudienceType;
  audienceIds: string[];
  pinned: boolean;
  requiresReceipt: boolean;
  coverImageUrl: string;
  attachments: string[];
  offlineAt: string;
}

export function createEmptyPortalContentEditorForm(): PortalContentEditorForm {
  return {
    category: 'NOTICE',
    title: '',
    summary: '',
    body: '',
    audienceType: 'ALL',
    audienceIds: [],
    pinned: false,
    requiresReceipt: false,
    coverImageUrl: '',
    attachments: [],
    offlineAt: '',
  };
}

export function createPortalContentEditorForm(
  content: PortalAdminContentDetail,
): PortalContentEditorForm {
  return {
    category: content.category,
    title: content.title,
    summary: content.summary,
    body: content.body,
    audienceType: content.audienceType,
    audienceIds: [...content.audienceIds],
    pinned: content.pinned,
    requiresReceipt: content.requiresReceipt,
    coverImageUrl: content.coverImageUrl ?? '',
    attachments: [...content.attachments],
    offlineAt: businessDateTimeInputValue(content.offlineAt),
  };
}
