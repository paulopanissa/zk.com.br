export interface UploadResult {
  key: string;
  bucket: string;
  size: number;
  mime_type: string;
  etag: string;
  uploaded_at: Date;
}

export interface SignedUrlResult {
  url: string;
  expires_at: Date;
}

export enum StorageBucket {
  LOGOS = 'logos',
  MEDIA = 'media',
  FISCAL = 'fiscal',
}

export enum StorageFolder {
  COMPANY_LOGO = 'logos/company',
  BRAND_LOGO = 'logos/brands',
  SUPPLIER_LOGO = 'logos/suppliers',
  PRODUCT_MEDIA = 'media/products',
  INVOICE_XML = 'fiscal/xml',
  INVOICE_PDF = 'fiscal/pdf',
}

export interface UploadOptions {
  folder: StorageFolder;
  filename: string;
  mime_type: string;
  max_size_bytes?: number;
  public?: boolean;
}

/** Tamanhos máximos por categoria (derivados do folder prefix) */
export const FOLDER_MAX_SIZES: Record<string, number> = {
  logos: 2 * 1024 * 1024,   // 2 MB
  media: 20 * 1024 * 1024,  // 20 MB
  fiscal: 10 * 1024 * 1024, // 10 MB
};

/** MIMEs permitidos por folder */
export const ALLOWED_MIMES: Record<StorageFolder, string[]> = {
  [StorageFolder.COMPANY_LOGO]: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
  [StorageFolder.BRAND_LOGO]: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
  [StorageFolder.SUPPLIER_LOGO]: ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'],
  [StorageFolder.PRODUCT_MEDIA]: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'],
  [StorageFolder.INVOICE_XML]: ['application/xml', 'text/xml'],
  [StorageFolder.INVOICE_PDF]: ['application/pdf'],
};

/** Folders cujos arquivos nunca podem ser deletados (obrigação fiscal - retenção 5 anos) */
export const PROTECTED_FOLDERS = [StorageFolder.INVOICE_XML, StorageFolder.INVOICE_PDF];
