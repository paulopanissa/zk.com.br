import { Injectable, PayloadTooLargeException, UnprocessableEntityException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as path from 'path';
import {
  ALLOWED_MIMES,
  FOLDER_MAX_SIZES,
  PROTECTED_FOLDERS,
  SignedUrlResult,
  StorageFolder,
  UploadOptions,
  UploadResult,
} from './storage.types';

// file-type@16 é CJS — importar com require para evitar problemas de interop ESM
// eslint-disable-next-line @typescript-eslint/no-var-requires
const fileType = require('file-type');

@Injectable()
export abstract class StorageService {
  /**
   * Detecta MIME via magic bytes.
   * Fallback para formatos text-based (SVG, XML, PDF) não detectados por magic bytes.
   */
  protected async detectMime(buffer: Buffer): Promise<string> {
    const result = await fileType.fromBuffer(buffer);
    if (result) return result.mime;

    // Fallback para formatos text-based não detectados por magic bytes
    const preview = buffer.slice(0, 512).toString('utf8');
    if (preview.startsWith('%PDF')) return 'application/pdf';
    if (preview.includes('<?xml') || preview.startsWith('<')) {
      if (preview.includes('<svg') || preview.includes('SVG')) return 'image/svg+xml';
      return 'application/xml';
    }
    throw new UnprocessableEntityException('Tipo de arquivo não reconhecido pelo servidor');
  }

  /**
   * Valida tamanho e MIME antes de subir o arquivo.
   * MIME é detectado via magic bytes — nunca confia no Content-Type do cliente.
   * Retorna o MIME detectado para ser usado no upload.
   */
  protected async validate(buffer: Buffer, options: UploadOptions): Promise<string> {
    // 1. Validar tamanho
    const maxSizeKey = options.folder.split('/')[0]; // 'logos', 'media', 'fiscal'
    const maxSize = options.max_size_bytes ?? FOLDER_MAX_SIZES[maxSizeKey] ?? 10 * 1024 * 1024;
    if (buffer.length > maxSize) {
      throw new PayloadTooLargeException(
        `Arquivo excede o tamanho máximo permitido de ${Math.round(maxSize / 1024 / 1024)} MB`,
      );
    }

    // 2. Detectar MIME via magic bytes (ignora o mime_type declarado pelo caller)
    const detectedMime = await this.detectMime(buffer);

    // 3. Verificar se MIME detectado está na lista de permitidos para o folder
    const allowed = ALLOWED_MIMES[options.folder] ?? [];
    if (!allowed.includes(detectedMime)) {
      throw new UnprocessableEntityException(
        `Tipo de arquivo '${detectedMime}' não permitido para ${options.folder}. Permitidos: ${allowed.join(', ')}`,
      );
    }

    return detectedMime;
  }

  /**
   * Gera a key do arquivo: {folder}/{uuid}{ext_original}.
   * Key é sempre gerada pelo servidor — nunca pelo caller.
   */
  protected buildKey(folder: StorageFolder, filename: string): string {
    const ext = path.extname(filename).toLowerCase() || '.bin';
    return `${folder}/${randomUUID()}${ext}`;
  }

  /**
   * Proteção de arquivos fiscais.
   * Lança exceção se tentar deletar arquivo de pasta fiscal (retenção obrigatória 5 anos).
   */
  protected assertDeletable(key: string): void {
    for (const protectedFolder of PROTECTED_FOLDERS) {
      if (key.startsWith(protectedFolder)) {
        throw new UnprocessableEntityException(
          `Arquivos em '${protectedFolder}' são protegidos por obrigação fiscal (retenção 5 anos) e não podem ser deletados`,
        );
      }
    }
  }

  abstract upload(buffer: Buffer, options: UploadOptions): Promise<UploadResult>;
  abstract delete(key: string): Promise<void>;
  abstract getSignedUrl(key: string, ttlSeconds: number): Promise<SignedUrlResult>;
  abstract getPublicUrl(key: string): string;
  abstract exists(key: string): Promise<boolean>;
}
