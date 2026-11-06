import { existsSync, mkdirSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';

/** 通用文件存储：所有上传文件都放在 OA_STORAGE_PATH（默认 ./storage）下的子目录。 */
export const MAX_UPLOAD_FILE_BYTES = 20 * 1024 * 1024;

/** 允许上传的类型：办公文档、PDF、图片、压缩包与纯文本。 */
export const ALLOWED_UPLOAD_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.txt',
  '.md',
  '.csv',
  '.rtf',
  '.zip',
  '.rar',
  '.7z',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.bmp',
]);

const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.rtf': 'application/rtf',
  '.zip': 'application/zip',
  '.rar': 'application/vnd.rar',
  '.7z': 'application/x-7z-compressed',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
};

/** 可直接在浏览器内联预览的类型。 */
const INLINE_MIME_TYPES = new Set(['application/pdf']);
const INLINE_MIME_PREFIXES = ['image/'];

export function storageRoot(subDirectory: string): string {
  const configured = process.env.OA_STORAGE_PATH;
  const root = configured ? resolve(configured) : resolve(process.cwd(), 'storage');
  const directory = resolve(root, subDirectory);
  if (!existsSync(directory)) mkdirSync(directory, { recursive: true });
  return directory;
}

export function storedFilePath(directory: string, storedName: string): string {
  // 存储名由服务端生成，此处再做一次路径逃逸防护
  return resolve(directory, basename(storedName));
}

export function fileExtension(fileName: string): string {
  return extname(fileName).toLowerCase();
}

export function assertUploadFileAllowed(fileName: string, sizeBytes: number): void {
  const extension = fileExtension(fileName);
  if (!ALLOWED_UPLOAD_EXTENSIONS.has(extension)) {
    throw new Error(
      `不支持的文件类型：${extension || '未知'}，请上传文档、表格、PDF、图片或压缩包`,
    );
  }
  if (sizeBytes > MAX_UPLOAD_FILE_BYTES) {
    throw new Error(`文件不能超过 ${Math.round(MAX_UPLOAD_FILE_BYTES / 1024 / 1024)}MB`);
  }
}

export function uploadMimeType(fileName: string): string {
  return MIME_BY_EXTENSION[fileExtension(fileName)] ?? 'application/octet-stream';
}

export function isInlinePreviewable(mimeType: string): boolean {
  return (
    INLINE_MIME_TYPES.has(mimeType) ||
    INLINE_MIME_PREFIXES.some((prefix) => mimeType.startsWith(prefix))
  );
}

export function contentTypeHeader(mimeType: string, inline: boolean): string {
  const base = mimeType.split(';')[0];
  return inline ? base : `${base}; charset=utf-8`.replace('; charset=utf-8', '');
}

/** 下载响应头：文件名需要同时提供 ASCII 回退与 UTF-8 编码形式。 */
export function contentDisposition(fileName: string, inline: boolean): string {
  const asciiFallback = fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
  return `${inline ? 'inline' : 'attachment'}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

/**
 * multipart 的文件名按 latin1 解析，中文会变成乱码；
 * 这里按 UTF-8 还原，还原失败时保留原值。
 */
export function decodeMultipartFileName(value: string): string {
  const decoded = Buffer.from(value, 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? value : decoded;
}
