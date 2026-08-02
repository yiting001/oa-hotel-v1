import { describe, expect, it } from 'vitest';
import {
  normalizePortalCalendarQuery,
  normalizePortalContentListQuery,
  normalizePortalReadingQuery,
} from './portal-query.input';

describe('portal query inputs', () => {
  it('normalizes category pagination values from HTTP query strings', () => {
    expect(
      normalizePortalContentListQuery({ category: 'NOTICE', page: '2', pageSize: '10' }),
    ).toEqual({ category: 'NOTICE', page: 2, pageSize: 10 });
  });

  it.each([
    [{}, 'PORTAL_CONTENT_QUERY_INVALID'],
    [{ category: 'UNKNOWN' }, 'PORTAL_CONTENT_QUERY_INVALID'],
    [{ category: 'NOTICE', page: 0 }, 'PORTAL_CONTENT_QUERY_INVALID'],
    [{ category: 'NOTICE', pageSize: 101 }, 'PORTAL_CONTENT_QUERY_INVALID'],
  ])('rejects invalid content pagination %#', (input, code) => {
    expect(() => normalizePortalContentListQuery(input)).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ code }) }),
    );
  });

  it.each([
    [{ from: '2026-07-01' }, 'PORTAL_CALENDAR_QUERY_INVALID'],
    [{ from: '2026-02-31', to: '2026-03-01' }, 'PORTAL_CALENDAR_QUERY_INVALID'],
    [{ from: '2026-08-01', to: '2026-07-01' }, 'PORTAL_CALENDAR_QUERY_INVALID'],
    [{ from: '2026-07-01', to: '2026-09-01' }, 'PORTAL_CALENDAR_QUERY_INVALID'],
  ])('rejects invalid calendar range %#', (input, code) => {
    expect(() => normalizePortalCalendarQuery(input)).toThrow(
      expect.objectContaining({ response: expect.objectContaining({ code }) }),
    );
  });

  it('normalizes and bounds reading pagination', () => {
    expect(normalizePortalReadingQuery({ status: 'UNREAD', page: '2', pageSize: '50' })).toEqual({
      status: 'UNREAD',
      page: 2,
      pageSize: 50,
    });
    expect(() => normalizePortalReadingQuery({ status: 'UNKNOWN' })).toThrow(
      expect.objectContaining({
        response: expect.objectContaining({ code: 'PORTAL_READING_QUERY_INVALID' }),
      }),
    );
    expect(() => normalizePortalReadingQuery({ status: 'READ', pageSize: 101 })).toThrow(
      expect.objectContaining({
        response: expect.objectContaining({ code: 'PORTAL_READING_QUERY_INVALID' }),
      }),
    );
  });
});
