import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../storage.service';
import { SignedUrlResult, UploadOptions, UploadResult } from '../storage.types';

@Injectable()
export class S3Driver extends StorageService {
  protected readonly client: S3Client;
  protected readonly bucket: string;

  constructor(protected readonly config: ConfigService) {
    super();
    this.client = new S3Client({
      region: config.get<string>('STORAGE_REGION', 'us-east-1'),
      credentials: {
        accessKeyId: config.getOrThrow<string>('STORAGE_ACCESS_KEY'),
        secretAccessKey: config.getOrThrow<string>('STORAGE_SECRET_KEY'),
      },
    });
    this.bucket = config.getOrThrow<string>('STORAGE_BUCKET');
  }

  async upload(buffer: Buffer, options: UploadOptions): Promise<UploadResult> {
    const mime = await this.validate(buffer, options);
    const key = this.buildKey(options.folder, options.filename);

    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: mime,
      ACL: options.public ? 'public-read' : 'private',
    });

    const result = await this.client.send(cmd);

    return {
      key,
      bucket: this.bucket,
      size: buffer.length,
      mime_type: mime,
      etag: result.ETag?.replace(/"/g, '') ?? '',
      uploaded_at: new Date(),
    };
  }

  async delete(key: string): Promise<void> {
    this.assertDeletable(key);
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async getSignedUrl(key: string, ttlSeconds: number): Promise<SignedUrlResult> {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const url = await getSignedUrl(this.client, cmd, { expiresIn: ttlSeconds });
    return { url, expires_at: new Date(Date.now() + ttlSeconds * 1000) };
  }

  getPublicUrl(key: string): string {
    const cdnBase = this.config.get<string>('STORAGE_CDN_BASE_URL', '');
    return cdnBase
      ? `${cdnBase}/${key}`
      : `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }
}
