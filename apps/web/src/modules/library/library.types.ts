export const LIBRARY_CATEGORIES = [
  'REGULATION',
  'LAW',
  'POLICY',
  'PROMOTION',
  'PHOTO',
  'OTHER',
] as const;

export type LibraryCategory = (typeof LIBRARY_CATEGORIES)[number];

export const libraryCategoryLabels: Record<LibraryCategory, string> = {
  REGULATION: '规章制度',
  LAW: '法律法规',
  POLICY: '政策文件',
  PROMOTION: '宣传材料',
  PHOTO: '公司照片',
  OTHER: '其他资料',
};

export interface LibraryDocument {
  id: string;
  title: string;
  category: LibraryCategory;
  description: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploaderId: string;
  uploaderName: string;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LibraryDocumentPage {
  items: LibraryDocument[];
  total: number;
  page: number;
  pageSize: number;
}

export interface LibraryUploadInput {
  title: string;
  category: LibraryCategory;
  description: string;
  file: File;
}
