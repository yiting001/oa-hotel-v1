import type { DocumentAttachmentItem } from '@oa/contracts';
import { registerDecorator, type ValidationOptions } from 'class-validator';

function isDocumentAttachmentItem(value: unknown): boolean {
  if (typeof value === 'string') {
    return value.trim().length > 0 && value.length <= 255;
  }
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    item.id.length > 0 &&
    typeof item.fileName === 'string' &&
    item.fileName.trim().length > 0 &&
    item.fileName.length <= 255
  );
}

/** 附件字段同时兼容历史文件名（字符串）与上传后的附件引用（{ id, fileName }）。 */
export function IsDocumentAttachmentList(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isDocumentAttachmentList',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: (value: unknown) =>
          Array.isArray(value) && value.every((item) => isDocumentAttachmentItem(item)),
        defaultMessage: () => '附件清单格式不正确',
      },
    });
  };
}

export type { DocumentAttachmentItem };
