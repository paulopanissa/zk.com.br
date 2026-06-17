import * as crypto from 'crypto';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

@Injectable()
export class CryptoService implements OnModuleInit {
  private encryptionKey!: Buffer;
  private hashKey!: string;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const keyHex = this.config.getOrThrow<string>('PII_ENCRYPTION_KEY');
    if (keyHex.length !== 64) {
      throw new Error('PII_ENCRYPTION_KEY must be 64 hex chars (32 bytes)');
    }
    this.encryptionKey = Buffer.from(keyHex, 'hex');
    this.hashKey = this.config.getOrThrow<string>('PII_HASH_KEY');
  }

  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) throw new Error('Invalid encrypted format');
    const [ivHex, tagHex, ciphertextHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    if (tag.length !== TAG_LENGTH) throw new Error('Invalid auth tag length');
    const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextHex, 'hex')),
      decipher.final(),
    ]).toString('utf8');
  }

  hashForSearch(value: string): string {
    return crypto
      .createHmac('sha256', this.hashKey)
      .update(value.toLowerCase().trim())
      .digest('hex');
  }
}
