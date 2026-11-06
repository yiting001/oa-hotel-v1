import {
  assertUploadFileAllowed,
  contentDisposition,
  contentTypeHeader,
  decodeMultipartFileName,
  fileExtension,
  isInlinePreviewable,
  MAX_UPLOAD_FILE_BYTES,
  storageRoot,
  storedFilePath,
  uploadMimeType,
} from '../../../common/storage/file-storage';

export const MAX_LIBRARY_FILE_BYTES = MAX_UPLOAD_FILE_BYTES;

export function libraryStorageRoot(): string {
  return storageRoot('library');
}

export function libraryFilePath(storedName: string): string {
  return storedFilePath(libraryStorageRoot(), storedName);
}

export function libraryExtension(fileName: string): string {
  return fileExtension(fileName);
}

export function assertLibraryFileAllowed(fileName: string, sizeBytes: number): void {
  assertUploadFileAllowed(fileName, sizeBytes);
}

export function libraryMimeType(fileName: string): string {
  return uploadMimeType(fileName);
}

export { contentDisposition, contentTypeHeader, decodeMultipartFileName, isInlinePreviewable };
