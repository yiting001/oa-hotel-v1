import type {
  FormFieldModel,
  FormFieldType,
  FormSchema,
  FormTableColumn,
  PrintSchema,
} from '../types/designer';
import { appConfig } from '../../../shared/app-config';
import { cloneJsonModel } from './json-model';

const defaultFormSubtitle = `${appConfig.companyName}${appConfig.productName}审批表`;

export const fieldCatalog: Array<{ type: FormFieldType; label: string; description: string }> = [
  { type: 'text', label: '单行文本', description: '姓名、标题、编号等短文本' },
  { type: 'textarea', label: '多行文本', description: '事由、说明等长文本' },
  { type: 'number', label: '数字金额', description: '数量、金额和比率' },
  { type: 'date', label: '日期', description: '申请日、计划日期' },
  { type: 'select', label: '选择项', description: '预设选项单选' },
  { type: 'table', label: '明细表格', description: '物资、费用等多行明细' },
  { type: 'attachment', label: '附件清单', description: '打印附件名称和页数' },
  { type: 'opinions', label: '审批意见', description: '意见、签名和审批日期' },
];

export function createDefaultFormSchema(title = '审批申请单'): FormSchema {
  return {
    schemaVersion: 1,
    layout: 'A4_GRID_FORM',
    title,
    subtitle: defaultFormSubtitle,
    columns: 2,
    fields: [
      createFormField('text', { key: 'applicantName', label: '申请人' }),
      createFormField('text', { key: 'departmentName', label: '申请部门' }),
      createFormField('date', { key: 'applicationDate', label: '申请日期' }),
      createFormField('text', { key: 'subject', label: '事项名称' }),
      createFormField('textarea', { key: 'reason', label: '申请事由', span: 2 }),
      createFormField('attachment', { key: 'attachments', label: '附件', span: 2 }),
      createFormField('opinions', { key: 'approvalOpinions', label: '审批意见', span: 2 }),
    ],
  };
}

export function createDefaultPrintSchema(schema = createDefaultFormSchema()): PrintSchema {
  return {
    schemaVersion: 1,
    editorMode: 'FIELD_GRID',
    paper: {
      size: 'A4',
      orientation: 'PORTRAIT',
      widthMm: 210,
      heightMm: 297,
      marginMm: { top: 14, right: 14, bottom: 14, left: 14 },
    },
    typography: { fontFamily: 'SimSun', baseFontSizePt: 10.5 },
    sections: createPrintSections(schema),
    options: { showDocumentNumber: true, showApprovalOpinions: true, gridLineWidth: 1 },
  };
}

export function createPrintSections(schema: FormSchema): PrintSchema['sections'] {
  const printableFields = schema.fields.filter(
    (field) => !['attachment', 'opinions'].includes(field.type),
  );
  const sections: PrintSchema['sections'] = [
    { type: 'TITLE', text: schema.title, fontSizePt: 22, align: 'CENTER' },
    {
      type: 'GRID',
      columns: [28, 62, 28, 62],
      fields: printableFields.map((field) => ({
        label: field.label,
        field: field.key,
        span: field.span,
        fieldType: field.type,
      })),
    },
  ];
  if (schema.fields.some((field) => field.type === 'attachment')) {
    sections.push({ type: 'ATTACHMENTS', label: '附件', field: 'attachments' });
  }
  if (schema.fields.some((field) => field.type === 'opinions')) {
    sections.push({ type: 'APPROVAL_OPINIONS', label: '审批意见', field: 'approvalOpinions' });
  }
  return sections;
}

export function syncPrintSchema(schema: FormSchema, printSchema: PrintSchema): PrintSchema {
  const sections =
    printSchema.editorMode === 'FIELD_GRID'
      ? createPrintSections(schema)
      : printSchema.sections.map((section) =>
          section.type === 'TITLE' ? { ...section, text: schema.title } : section,
        );
  return {
    ...cloneJsonModel(printSchema),
    sections: sections.filter(
      (section) => section.type !== 'APPROVAL_OPINIONS' || printSchema.options.showApprovalOpinions,
    ),
  };
}

export function normalizePrintSchema(
  schema: FormSchema,
  value: Partial<PrintSchema> | null,
): PrintSchema {
  const fallback = createDefaultPrintSchema(schema);
  return {
    ...fallback,
    ...value,
    paper: {
      ...fallback.paper,
      ...(value?.paper ?? {}),
      marginMm: { ...fallback.paper.marginMm, ...(value?.paper?.marginMm ?? {}) },
    },
    sections: value?.sections?.length ? value.sections : fallback.sections,
    options: { ...fallback.options, ...(value?.options ?? {}) },
  };
}

export function createFormField(
  type: FormFieldType,
  overrides: Partial<FormFieldModel> = {},
): FormFieldModel {
  const catalog = fieldCatalog.find((item) => item.type === type);
  const id = crypto.randomUUID();
  const tableColumns: FormTableColumn[] = [
    createTableColumn('itemName', '项目'),
    createTableColumn('quantity', '数量'),
    createTableColumn('remark', '备注'),
  ];
  return {
    id,
    key: `field_${id.replaceAll('-', '').slice(0, 8)}`,
    label: catalog?.label ?? '字段',
    type,
    sourceType: persistedType(type),
    required: false,
    placeholder: type === 'textarea' ? '请填写详细内容' : '请填写',
    span: ['textarea', 'table', 'attachment', 'opinions'].includes(type) ? 2 : 1,
    ...(type === 'select' ? { options: ['选项一', '选项二'] } : {}),
    ...(type === 'table' ? { columns: tableColumns } : {}),
    ...overrides,
  };
}

export function normalizeFormSchema(
  value: Record<string, unknown>,
  fallbackTitle: string,
): FormSchema {
  const rawFields = Array.isArray(value.fields) ? value.fields : [];
  const knownSchemaKeys = new Set([
    'schemaVersion',
    'layout',
    'title',
    'subtitle',
    'columns',
    'fields',
  ]);
  return {
    schemaVersion: typeof value.schemaVersion === 'number' ? value.schemaVersion : 1,
    layout: typeof value.layout === 'string' ? value.layout : 'A4_GRID_FORM',
    title: typeof value.title === 'string' ? value.title : fallbackTitle,
    subtitle: typeof value.subtitle === 'string' ? value.subtitle : defaultFormSubtitle,
    columns: 2,
    fields: rawFields.filter(isRecord).map((field, index) => normalizeField(field, index)),
    extensions: Object.fromEntries(
      Object.entries(value).filter(([key]) => !knownSchemaKeys.has(key)),
    ),
  };
}

export function serializeFormSchema(schema: FormSchema): Record<string, unknown> {
  return {
    ...(schema.extensions ?? {}),
    schemaVersion: schema.schemaVersion,
    layout: schema.layout,
    title: schema.title,
    subtitle: schema.subtitle,
    columns: schema.columns,
    fields: schema.fields.map(({ extensions, sourceType, ...field }) => ({
      ...(extensions ?? {}),
      ...field,
      type: sourceType || persistedType(field.type),
    })),
  };
}

export function createTableColumn(key = '', label = '新列'): FormTableColumn {
  return { id: crypto.randomUUID(), key: key || `column_${Date.now()}`, label, width: 120 };
}

export function cloneFormSchema(schema: FormSchema): FormSchema {
  return cloneJsonModel(schema);
}

export function validateFormSchema(schema: FormSchema): string[] {
  const errors: string[] = [];
  if (!schema.title.trim()) errors.push('请填写打印表单标题');
  if (schema.fields.length === 0) errors.push('表单至少需要一个字段');
  if (schema.fields.some((field) => !field.label.trim() || !field.key.trim()))
    errors.push('所有字段都必须填写名称和字段标识');
  if (new Set(schema.fields.map((field) => field.key)).size !== schema.fields.length)
    errors.push('字段标识不能重复');
  if (
    schema.fields.some(
      (field) => field.type === 'select' && !field.options?.some((option) => option.trim()),
    )
  )
    errors.push('选择项至少需要一个有效选项');
  if (schema.fields.some((field) => field.type === 'table' && !field.columns?.length))
    errors.push('明细表格至少需要一列');
  return errors;
}

function normalizeField(value: Record<string, unknown>, index: number): FormFieldModel {
  const sourceType = typeof value.type === 'string' ? value.type : 'TEXT';
  const type = editableType(sourceType);
  const knownKeys = new Set([
    'id',
    'key',
    'label',
    'type',
    'required',
    'placeholder',
    'span',
    'options',
    'columns',
  ]);
  const key = typeof value.key === 'string' && value.key ? value.key : `field_${index + 1}`;
  const options = Array.isArray(value.options)
    ? value.options.filter((item): item is string => typeof item === 'string')
    : undefined;
  const columns = Array.isArray(value.columns)
    ? value.columns.filter(isRecord).map((column, columnIndex) => ({
        id: typeof column.id === 'string' ? column.id : crypto.randomUUID(),
        key:
          typeof column.key === 'string' && column.key ? column.key : `column_${columnIndex + 1}`,
        label: typeof column.label === 'string' ? column.label : `第 ${columnIndex + 1} 列`,
        width: typeof column.width === 'number' ? column.width : 120,
      }))
    : undefined;
  return {
    id: typeof value.id === 'string' ? value.id : crypto.randomUUID(),
    key,
    label: typeof value.label === 'string' ? value.label : key,
    type,
    sourceType,
    required: value.required === true,
    placeholder: typeof value.placeholder === 'string' ? value.placeholder : '请填写',
    span:
      value.span === 2 || ['textarea', 'table', 'attachment', 'opinions'].includes(type) ? 2 : 1,
    ...(options ? { options } : {}),
    ...(columns ? { columns } : {}),
    extensions: Object.fromEntries(Object.entries(value).filter(([name]) => !knownKeys.has(name))),
  };
}

function editableType(type: string): FormFieldType {
  const normalized = type.toUpperCase();
  if (['LONG_TEXT', 'TEXTAREA'].includes(normalized)) return 'textarea';
  if (['NUMBER', 'MONEY', 'DECIMAL', 'INTEGER'].includes(normalized)) return 'number';
  if (normalized === 'DATE' || normalized === 'DATETIME') return 'date';
  if (['SELECT', 'RADIO', 'ENUM'].includes(normalized)) return 'select';
  if (['TABLE', 'DETAIL_TABLE'].includes(normalized)) return 'table';
  if (['ATTACHMENT', 'ATTACHMENTS'].includes(normalized)) return 'attachment';
  if (['OPINIONS', 'APPROVAL_OPINIONS'].includes(normalized)) return 'opinions';
  return 'text';
}

function persistedType(type: FormFieldType): string {
  return {
    text: 'TEXT',
    textarea: 'LONG_TEXT',
    number: 'NUMBER',
    date: 'DATE',
    select: 'SELECT',
    table: 'TABLE',
    attachment: 'ATTACHMENTS',
    opinions: 'APPROVAL_OPINIONS',
  }[type];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
