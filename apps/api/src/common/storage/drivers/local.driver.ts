import * as fs from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService } from '../storage.service';
import { SignedUrlResult, UploadOptions, UploadResult } from '../storage.types';

/**
 * Driver local de armazenamento para desenvolvimento e testes.
 * Armazena arquivos em {cwd}/uploads/.
 * Não exige credenciais cloud (não chama getOrThrow para ACCESS_KEY/SECRET_KEY).
 * NÃO usar em produção.
 */
@Injectable()
export class LocalDriver extends StorageService {
  private readonly basePath: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    super();
    this.basePath = path.join(process.cwd(), 'uploads');
    const port = config.get<number>('PORT', 3000);
    this.baseUrl = `http://localhost:${port}/uploads`;
    fs.mkdirSync(this.basePath, { recursive: true });
  }

  async upload(buffer: Buffer, options: UploadOptions): Promise<UploadResult> {
    const mime = await this.validate(buffer, options);
    const key = this.buildKey(options.folder, options.filename);
    const fullPath = path.join(this.basePath, key.replace(/\//g, path.sep));

    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, buffer);

    return {
      key,
      bucket: 'local',
      size: buffer.length,
      mime_type: mime,
      etag: `local-${Date.now()}`,
      uploaded_at: new Date(),
    };
  }

  async delete(key: string): Promise<void> {
    this.assertDeletable(key);
    const fullPath = path.join(this.basePath, key.replace(/\//g, path.sep));
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  async getSignedUrl(key: string, ttlSeconds: number): Promise<SignedUrlResult> {
    // Local: simula URL assinada com query param de expiração (desenvolvimento apenas)
    const expires = Date.now() + ttlSeconds * 1000;
    return {
      url: `${this.baseUrl}/${key}?expires=${expires}`,
      expires_at: new Date(expires),
    };
  }

  getPublicUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }

  async exists(key: string): Promise<boolean> {
    return fs.existsSync(path.join(this.basePath, key.replace(/\//g, path.sep)));
  }
}
