import * as crypto from 'crypto';
import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  PaymentChannel,
  PaymentEnvironment,
  PaymentMethod,
  PaymentMethodMapping,
  PaymentProvider,
  PaymentProviderSlug,
} from '@prisma/client';
import { CryptoService } from '../../common/crypto/crypto.service';
import { SetChannelConfigDto } from './dto/set-channel-config.dto';
import { UpsertCredentialsDto } from './dto/upsert-credentials.dto';
import { UpsertMethodMappingDto } from './dto/upsert-method-mapping.dto';
import { PaymentConfigRepository, ProviderWithCredentials } from './payment-config.repository';

/** Credential keys required per provider slug to mark it as "active". */
const REQUIRED_CREDENTIAL_KEYS: Record<PaymentProviderSlug, string[]> = {
  [PaymentProviderSlug.MERCADO_PAGO]: ['ACCESS_TOKEN', 'PUBLIC_KEY'],
  [PaymentProviderSlug.ASAAS]: ['API_KEY'],
  [PaymentProviderSlug.STRIPE]: ['SECRET_KEY', 'PUBLISHABLE_KEY'],
  [PaymentProviderSlug.PAGSEGURO]: ['CLIENT_ID', 'CLIENT_SECRET'],
  [PaymentProviderSlug.PAYPAL]: ['CLIENT_ID', 'CLIENT_SECRET'],
};

export interface ProviderSummary {
  id: string;
  slug: PaymentProviderSlug;
  nome_exibicao: string;
  ativo: boolean;
}

export interface ProviderDetail {
  id: string;
  slug: PaymentProviderSlug;
  nome_exibicao: string;
  ativo: boolean;
  credentials: { chave: string; ambiente: PaymentEnvironment; configurado: true }[];
}

export interface WebhookReceiveResult {
  accepted: boolean;
  duplicate: boolean;
}

@Injectable()
export class PaymentConfigService {
  constructor(
    private readonly repository: PaymentConfigRepository,
    private readonly cryptoService: CryptoService,
  ) {}

  // ─── Providers ───────────────────────────────────────────────────────────────

  async listProviders(): Promise<ProviderSummary[]> {
    const providers = await this.repository.findAllProviders();
    return providers.map(({ id, slug, nome_exibicao, ativo }) => ({
      id,
      slug,
      nome_exibicao,
      ativo,
    }));
  }

  async getProvider(slug: PaymentProviderSlug): Promise<ProviderDetail> {
    const provider = await this.resolveProviderOrFail(slug);
    return this.toProviderDetail(provider);
  }

  async activateProvider(slug: PaymentProviderSlug): Promise<ProviderDetail> {
    const provider = await this.resolveProviderOrFail(slug);

    const required = REQUIRED_CREDENTIAL_KEYS[slug];
    const configured = new Set(provider.credentials.map((c) => c.chave));
    const missing = required.filter((key) => !configured.has(key));

    if (missing.length > 0) {
      throw new UnprocessableEntityException({
        message: `Provedor não pode ser habilitado: credenciais obrigatórias ausentes.`,
        missing_keys: missing,
      });
    }

    const updated = await this.repository.updateProviderAtivo(slug, true);
    return this.toProviderDetail({ ...updated, credentials: provider.credentials });
  }

  async setWebhookSecret(slug: PaymentProviderSlug, secret: string): Promise<{ configured: true }> {
    await this.resolveProviderOrFail(slug);
    const encrypted = this.cryptoService.encrypt(secret);
    await this.repository.updateWebhookSecret(slug, encrypted);
    return { configured: true };
  }

  async deactivateProvider(slug: PaymentProviderSlug): Promise<ProviderDetail> {
    const provider = await this.resolveProviderOrFail(slug);
    const updated = await this.repository.updateProviderAtivo(slug, false);
    return this.toProviderDetail({ ...updated, credentials: provider.credentials });
  }

  // ─── Credentials ─────────────────────────────────────────────────────────────

  async upsertCredentials(
    slug: PaymentProviderSlug,
    dto: UpsertCredentialsDto,
  ): Promise<ProviderDetail> {
    const provider = await this.resolveProviderOrFail(slug);

    for (const item of dto.credentials) {
      const encrypted = this.cryptoService.encrypt(item.valor);
      await this.repository.upsertCredential(
        provider.id,
        item.chave,
        encrypted,
        item.ambiente,
      );
    }

    // Reload to return updated credential list
    const refreshed = await this.resolveProviderOrFail(slug);
    return this.toProviderDetail(refreshed);
  }

  async deleteCredential(
    slug: PaymentProviderSlug,
    chave: string,
    ambiente: PaymentEnvironment,
  ): Promise<void> {
    const provider = await this.resolveProviderOrFail(slug);

    try {
      await this.repository.deleteCredential(provider.id, chave, ambiente);
    } catch {
      throw new NotFoundException(
        `Credencial "${chave}" para ambiente ${ambiente} não encontrada.`,
      );
    }
  }

  // ─── Channel configs ─────────────────────────────────────────────────────────

  async listChannelConfigs() {
    return this.repository.findAllChannelConfigs();
  }

  async setChannelConfig(canal: PaymentChannel, dto: SetChannelConfigDto) {
    // Ensure the referenced provider exists
    const provider = await this.repository.findAllProviders().then((list) =>
      list.find((p) => p.id === dto.provider_id),
    );

    if (!provider) {
      throw new NotFoundException(`Provedor com id "${dto.provider_id}" não encontrado.`);
    }

    return this.repository.upsertChannelConfig(canal, dto.provider_id, dto.ambiente);
  }

  // ─── Method mappings ─────────────────────────────────────────────────────────

  async listMethodMappings() {
    return this.repository.findAllMethodMappings();
  }

  async upsertMethodMapping(dto: UpsertMethodMappingDto): Promise<PaymentMethodMapping> {
    // Business rule: MAQUININHA_POINT is only valid for PDV + MERCADO_PAGO
    if (dto.metodo === PaymentMethod.MAQUININHA_POINT) {
      if (dto.canal !== PaymentChannel.PDV) {
        throw new UnprocessableEntityException(
          'MAQUININHA_POINT só é válido para o canal PDV.',
        );
      }

      const providers = await this.repository.findAllProviders();
      const provider = providers.find((p) => p.id === dto.provider_id);

      if (!provider || provider.slug !== PaymentProviderSlug.MERCADO_PAGO) {
        throw new UnprocessableEntityException(
          'MAQUININHA_POINT só é compatível com o provedor MERCADO_PAGO.',
        );
      }
    }

    return this.repository.upsertMethodMapping({
      canal: dto.canal,
      metodo: dto.metodo,
      provider_id: dto.provider_id,
      taxa_percentual: dto.taxa_percentual,
      taxa_fixa_centavos: dto.taxa_fixa_centavos,
    });
  }

  async toggleMethodMapping(id: string): Promise<PaymentMethodMapping> {
    const mapping = await this.repository.findMethodMappingById(id);

    if (!mapping) {
      throw new NotFoundException(`Mapeamento de método com id "${id}" não encontrado.`);
    }

    return this.repository.toggleMethodMapping(id, !mapping.ativo);
  }

  // ─── Connectivity test ────────────────────────────────────────────────────────

  async testProviderConnectivity(
    slug: PaymentProviderSlug,
  ): Promise<{ status: string; message: string; provider: string }> {
    await this.resolveProviderOrFail(slug);

    // Stub — real connectivity test to be implemented per provider when SDK is integrated
    return {
      status: 'ok',
      message: 'connectivity test not implemented',
      provider: slug,
    };
  }

  // ─── Webhook ─────────────────────────────────────────────────────────────────

  async receiveWebhook(
    slug: PaymentProviderSlug,
    body: object,
    signature: string,
  ): Promise<WebhookReceiveResult> {
    const provider = await this.resolveProviderOrFail(slug);

    // Verify HMAC signature
    const isValid = this.verifyWebhookSignature(provider, body, signature);
    if (!isValid) {
      throw new UnauthorizedException('Assinatura do webhook inválida.');
    }

    // Extract a stable event_id from the payload; fall back to a hash of the body
    const eventId = this.extractEventId(body);

    const created = await this.repository.createWebhookEvent(slug, eventId, body as object);

    if (created === null) {
      // Duplicate event — already processed
      return { accepted: true, duplicate: true };
    }

    // TODO: publish to RabbitMQ queue for async processing when worker is wired up
    // e.g.: await this.amqpConnection.publish('payment', 'webhook.received', { eventId: created.id });

    return { accepted: true, duplicate: false };
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async resolveProviderOrFail(slug: PaymentProviderSlug): Promise<ProviderWithCredentials> {
    const provider = await this.repository.findProviderBySlug(slug);
    if (!provider) {
      throw new NotFoundException(`Provedor "${slug}" não encontrado.`);
    }
    return provider;
  }

  private toProviderDetail(provider: ProviderWithCredentials): ProviderDetail {
    return {
      id: provider.id,
      slug: provider.slug,
      nome_exibicao: provider.nome_exibicao,
      ativo: provider.ativo,
      // Values are never returned — only metadata indicating that a key is configured
      credentials: provider.credentials.map(({ chave, ambiente }) => ({
        chave,
        ambiente,
        configurado: true as const,
      })),
    };
  }

  private verifyWebhookSignature(
    provider: PaymentProvider & { webhook_secret?: string | null },
    body: object,
    signature: string,
  ): boolean {
    if (!provider.webhook_secret) return false;

    let secret: string;
    try {
      secret = this.cryptoService.decrypt(provider.webhook_secret);
    } catch {
      return false;
    }

    const payload = Buffer.from(JSON.stringify(body));
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      // timingSafeEqual throws if buffers have different lengths
      return false;
    }
  }

  private extractEventId(body: object): string {
    // Common event ID fields across providers
    const candidate =
      (body as Record<string, unknown>)['id'] ??
      (body as Record<string, unknown>)['event_id'] ??
      (body as Record<string, unknown>)['notificationCode'];

    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate;
    }

    // Fallback: deterministic hash of the entire payload
    return crypto.createHash('sha256').update(JSON.stringify(body)).digest('hex');
  }
}
