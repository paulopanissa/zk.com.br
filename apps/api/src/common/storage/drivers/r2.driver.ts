import { S3Client } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Driver } from './s3.driver';

/**
 * Driver para Cloudflare R2.
 * R2 é S3-compatible — herda S3Driver e sobrescreve apenas o endpoint e a URL pública.
 * Credenciais via STORAGE_ACCESS_KEY / STORAGE_SECRET_KEY (nunca hardcoded).
 */
@Injectable()
export class R2Driver extends S3Driver {
  constructor(config: ConfigService) {
    super(config);

    // Override: R2 usa endpoint customizado (<account_id>.r2.cloudflarestorage.com)
    const endpoint = config.getOrThrow<string>('STORAGE_ENDPOINT');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this as any).client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: {
        accessKeyId: config.getOrThrow<string>('STORAGE_ACCESS_KEY'),
        secretAccessKey: config.getOrThrow<string>('STORAGE_SECRET_KEY'),
      },
    });
  }

  override getPublicUrl(key: string): string {
    const cdnBase = this.config.get<string>('STORAGE_CDN_BASE_URL', '');
    if (!cdnBase) {
      throw new Error('STORAGE_CDN_BASE_URL é obrigatório para URLs públicas com R2');
    }
    return `${cdnBase}/${key}`;
  }
}
