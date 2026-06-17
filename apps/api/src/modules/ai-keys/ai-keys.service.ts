import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AiApiKey, AiProvider, Prisma } from '@prisma/client';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { CryptoService } from '../../common/crypto/crypto.service';
import { TenancyService } from '../../common/tenancy/tenancy.service';
import { AiKeysRepository } from './ai-keys.repository';
import { CreateAiKeyDto } from './dto/create-ai-key.dto';
import { UpdateAiKeyDto } from './dto/update-ai-key.dto';

function buildKeyMask(prefix: string, suffix: string): string {
  return `${prefix}****${suffix}`;
}

function extractPrefixSuffix(rawKey: string): { key_prefix: string; key_suffix: string } {
  const safe = rawKey.length <= 10 ? rawKey.padEnd(10, '*') : rawKey;
  return { key_prefix: safe.slice(0, 6), key_suffix: safe.slice(-4) };
}

function stripKey(key: AiApiKey): Omit<AiApiKey, 'key_encrypted'> & { key_masked: string } {
  const { key_encrypted, ...rest } = key;
  return { ...rest, key_masked: buildKeyMask(key.key_prefix, key.key_suffix) };
}

export type SafeAiKey = ReturnType<typeof stripKey>;

// Minimal connectivity test payloads per provider
const TEST_ENDPOINTS: Record<
  AiProvider,
  { url: string; buildBody: () => object; authHeader: (k: string) => Record<string, string> }
> = {
  [AiProvider.OPENAI]: {
    url: 'https://api.openai.com/v1/chat/completions',
    buildBody: () => ({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 }),
    authHeader: (k) => ({ Authorization: `Bearer ${k}` }),
  },
  [AiProvider.DEEPSEEK]: {
    url: 'https://api.deepseek.com/chat/completions',
    buildBody: () => ({ model: 'deepseek-chat', messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 }),
    authHeader: (k) => ({ Authorization: `Bearer ${k}` }),
  },
  [AiProvider.GOOGLE_GEMINI]: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
    buildBody: () => ({ contents: [{ parts: [{ text: 'ping' }] }] }),
    authHeader: (k) => ({ 'x-goog-api-key': k }),
  },
  [AiProvider.ANTHROPIC]: {
    url: 'https://api.anthropic.com/v1/messages',
    buildBody: () => ({ model: 'claude-haiku-4-5-20251001', max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
    authHeader: (k) => ({ 'x-api-key': k, 'anthropic-version': '2023-06-01' }),
  },
};

@Injectable()
export class AiKeysService {
  constructor(
    private readonly repository: AiKeysRepository,
    private readonly tenancy: TenancyService,
    private readonly crypto: CryptoService,
  ) {}

  async create(dto: CreateAiKeyDto, user: JwtSystemPayload): Promise<SafeAiKey> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const { key_prefix, key_suffix } = extractPrefixSuffix(dto.key);
    const keyEncrypted = this.crypto.encrypt(dto.key);

    try {
      const created = await this.repository.create({
        provider: dto.provider,
        label: dto.label,
        key_encrypted: keyEncrypted,
        key_prefix,
        key_suffix,
        active: dto.active ?? true,
        unit: { connect: { id: unitId } },
      });
      return stripKey(created);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new ConflictException(
          `Já existe uma key com label "${dto.label}" para ${dto.provider} nesta unidade`,
        );
      }
      throw e;
    }
  }

  async findAll(user: JwtSystemPayload, provider?: AiProvider): Promise<SafeAiKey[]> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const keys = await this.repository.findAll(unitId, provider);
    return keys.map(stripKey);
  }

  async findOne(id: string, user: JwtSystemPayload): Promise<SafeAiKey> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const key = await this.repository.findById(id, unitId);
    if (!key) throw new NotFoundException('API key não encontrada');
    return stripKey(key);
  }

  async update(id: string, dto: UpdateAiKeyDto, user: JwtSystemPayload): Promise<SafeAiKey> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const existing = await this.repository.findById(id, unitId);
    if (!existing) throw new NotFoundException('API key não encontrada');

    const updateData: Parameters<typeof this.repository.update>[2] = {};
    if (dto.label !== undefined) updateData.label = dto.label;
    if (dto.active !== undefined) updateData.active = dto.active;
    if (dto.key !== undefined) {
      const { key_prefix, key_suffix } = extractPrefixSuffix(dto.key);
      updateData.key_encrypted = this.crypto.encrypt(dto.key);
      updateData.key_prefix = key_prefix;
      updateData.key_suffix = key_suffix;
    }

    const updated = await this.repository.update(id, unitId, updateData);
    return stripKey(updated);
  }

  async remove(id: string, user: JwtSystemPayload): Promise<{ deleted: boolean }> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const existing = await this.repository.findById(id, unitId);
    if (!existing) throw new NotFoundException('API key não encontrada');
    await this.repository.delete(id, unitId);
    return { deleted: true };
  }

  async testKey(
    id: string,
    user: JwtSystemPayload,
  ): Promise<{ ok: boolean; latency_ms: number; error?: string }> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const record = await this.repository.findById(id, unitId);
    if (!record) throw new NotFoundException('API key não encontrada');

    const rawKey = this.crypto.decrypt(record.key_encrypted);
    const endpoint = TEST_ENDPOINTS[record.provider];
    const start = Date.now();
    let ok = false;
    let error: string | undefined;

    try {
      const res = await fetch(endpoint.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...endpoint.authHeader(rawKey) },
        body: JSON.stringify(endpoint.buildBody()),
        signal: AbortSignal.timeout(10_000),
      });
      // C2: never include provider response body — may contain the key in error messages
      ok = res.status >= 200 && res.status < 300;
      if (!ok) {
        error = `HTTP ${res.status}`;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }

    const latency_ms = Date.now() - start;

    await this.repository.update(id, unitId, {
      last_tested_at: new Date(),
      last_test_ok: ok,
      last_test_latency_ms: latency_ms,
    });

    return { ok, latency_ms, ...(error ? { error } : {}) };
  }

  // SECURITY: returns plaintext API key — caller must never log or serialize this value.
  // Used exclusively by the AI integration module (spec 27) at call-time.
  async resolveActiveKey(unitId: string, provider: AiProvider): Promise<string> {
    const record = await this.repository.findActiveByProvider(unitId, provider);
    if (!record) throw new NotFoundException(`Nenhuma API key ativa para ${provider} nesta unidade`);
    return this.crypto.decrypt(record.key_encrypted);
  }
}
