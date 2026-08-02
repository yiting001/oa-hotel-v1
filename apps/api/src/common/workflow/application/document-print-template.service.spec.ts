import type { SessionUser } from '@oa/contracts';
import { describe, expect, it, vi } from 'vitest';
import { DocumentPrintTemplateService } from './document-print-template.service';

const user = { id: 'user-1' } as SessionUser;

describe('DocumentPrintTemplateService', () => {
  it('returns the immutable form version bound to the document', async () => {
    const workflow = {
      getViewableDocument: vi.fn().mockResolvedValue({ formVersionId: 'form-version-1' }),
    };
    const forms = {
      getVersion: vi.fn().mockResolvedValue({
        id: 'form-version-1',
        definitionId: 'form-definition-1',
        version: 3,
        schemaJson: { fields: [{ key: 'title' }] },
        printSchemaJson: { paper: { size: 'A4' }, sections: [{ type: 'TITLE' }] },
      }),
      get: vi.fn().mockResolvedValue({
        id: 'form-definition-1',
        code: 'REQUEST_REPORT',
        name: '请示报告',
      }),
    };
    const service = new DocumentPrintTemplateService(workflow as never, forms as never);

    await expect(service.get('document-1', user)).resolves.toMatchObject({
      formVersionId: 'form-version-1',
      definitionCode: 'REQUEST_REPORT',
      definitionName: '请示报告',
      version: 3,
    });
    expect(forms.getVersion).toHaveBeenCalledWith('form-version-1');
  });

  it('keeps legacy documents printable when no form version was bound', async () => {
    const workflow = {
      getViewableDocument: vi.fn().mockResolvedValue({ formVersionId: null }),
    };
    const forms = { getVersion: vi.fn(), get: vi.fn() };
    const service = new DocumentPrintTemplateService(workflow as never, forms as never);

    await expect(service.get('legacy-document', user)).resolves.toBeNull();
    expect(forms.getVersion).not.toHaveBeenCalled();
  });
});
