import type {
  PortalCalendarResponse,
  PortalContentCategory,
  PortalContentDetail,
  PortalContentPage,
  PortalHomeResponse,
  PortalReadingResponse,
  PortalReadingStatus,
} from '@oa/contracts';
import { apiRequest } from '../../../shared/api';

export function loadPortalHome(): Promise<PortalHomeResponse> {
  return apiRequest<PortalHomeResponse>('/portal/home');
}

export function loadPortalReading(
  status: PortalReadingStatus,
  page = 1,
  pageSize = 20,
): Promise<PortalReadingResponse> {
  const parameters = new URLSearchParams({
    status,
    page: String(page),
    pageSize: String(pageSize),
  });
  return apiRequest<PortalReadingResponse>(`/portal/reading?${parameters.toString()}`);
}

export function loadPortalContent(contentId: string): Promise<PortalContentDetail> {
  return apiRequest<PortalContentDetail>(`/portal/contents/${contentId}`);
}

export function loadPortalContents(
  category: PortalContentCategory,
  page: number,
  pageSize: number,
): Promise<PortalContentPage> {
  const parameters = new URLSearchParams({
    category,
    page: String(page),
    pageSize: String(pageSize),
  });
  return apiRequest<PortalContentPage>(`/portal/contents?${parameters.toString()}`);
}

export function loadPortalCalendar(from: string, to: string): Promise<PortalCalendarResponse> {
  const parameters = new URLSearchParams({ from, to });
  return apiRequest<PortalCalendarResponse>(`/portal/calendar?${parameters.toString()}`);
}

export function markPortalContentRead(contentId: string): Promise<{
  contentId: string;
  readAt: string;
}> {
  return apiRequest(`/portal/contents/${contentId}/read`, { method: 'POST' });
}
