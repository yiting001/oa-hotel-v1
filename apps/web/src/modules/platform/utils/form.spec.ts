import { describe, expect, it } from 'vitest';
import { reactive } from 'vue';
import {
  cloneFormSchema,
  createDefaultFormSchema,
  createDefaultPrintSchema,
  normalizeFormSchema,
  serializeFormSchema,
  syncPrintSchema,
} from './form';

describe('form designer schema adapter', () => {
  it('normalizes persisted field types without losing their business semantics', () => {
    const schema = normalizeFormSchema(
      {
        schemaVersion: 1,
        layout: 'SECTIONED_FORM',
        fields: [
          { key: 'departmentId', label: '申请部门', type: 'DEPARTMENT', required: true },
          { key: 'content', label: '请示事项', type: 'LONG_TEXT', maxLength: 5000 },
          { key: 'attachments', label: '附件', type: 'ATTACHMENTS' },
        ],
      },
      '请示报告',
    );

    expect(schema.fields.map((field) => field.type)).toEqual(['text', 'textarea', 'attachment']);
    const persisted = serializeFormSchema(schema);
    expect(persisted.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'departmentId', type: 'DEPARTMENT' }),
        expect.objectContaining({ key: 'content', type: 'LONG_TEXT', maxLength: 5000 }),
      ]),
    );
  });

  it('creates a publishable A4 print composition', () => {
    const schema = createDefaultFormSchema('付款审批单');
    const print = createDefaultPrintSchema(schema);

    expect(print.paper).toMatchObject({ size: 'A4', widthMm: 210, heightMm: 297 });
    expect(print.sections.some((section) => section.type === 'GRID')).toBe(true);
    expect(print.sections.some((section) => section.type === 'ATTACHMENTS')).toBe(true);
    expect(print.sections.some((section) => section.type === 'APPROVAL_OPINIONS')).toBe(true);
  });

  it('clones reactive form and print models before saving', () => {
    const schema = reactive(createDefaultFormSchema('付款审批单'));
    const print = reactive(createDefaultPrintSchema(schema));

    expect(cloneFormSchema(schema)).toEqual(schema);
    expect(syncPrintSchema(schema, print)).toMatchObject({ paper: { size: 'A4' } });
  });

  it('preserves precise A4 sections when a built-in template is copied', () => {
    const schema = createDefaultFormSchema('请示报告（修订）');
    const print = createDefaultPrintSchema(schema);
    delete print.editorMode;
    print.sections = [
      { type: 'TITLE', text: '请示报告' },
      {
        type: 'GRID',
        rows: [[{ label: '请示题目', field: 'title', colSpan: 3 }]],
      },
      { type: 'CONTENT', label: '请示内容', field: 'content', minHeightMm: 92 },
    ];

    const synced = syncPrintSchema(schema, print);

    expect(synced.sections[0]).toMatchObject({ type: 'TITLE', text: '请示报告（修订）' });
    expect(synced.sections[1]).toEqual(print.sections[1]);
    expect(synced.sections[2]).toEqual(print.sections[2]);
  });
});
