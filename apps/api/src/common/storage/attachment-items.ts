import type { DocumentAttachmentItem } from '@oa/contracts';

/**
 * 统一单据附件清单形态：上传附件保留 id 与文件名，历史数据保留纯文件名。
 * 仅保留可展示的条目，避免脏数据进入单据 JSON。
 */
export function normalizeAttachments(
  value: readonly DocumentAttachmentItem[],
): DocumentAttachmentItem[] {
  const result: DocumentAttachmentItem[] = [];
  for (const item of value) {
    if (typeof item === 'string') {
      const fileName = item.trim();
      if (fileName) result.push(fileName);
      continue;
    }
    const fileName = item.fileName.trim();
    if (item.id && fileName) {
      result.push({ id: item.id, fileName });
    }
  }
  return result;
}
