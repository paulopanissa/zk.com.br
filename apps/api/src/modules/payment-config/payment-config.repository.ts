import { Injectable } from '@nestjs/common';
import {
  PaymentChannel,
  PaymentChannelConfig,
  PaymentEnvironment,
  PaymentMethodMapping,
  PaymentProvider,
  PaymentProviderCredential,
  PaymentProviderSlug,
  PaymentWebhookEvent,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type ProviderWithCredentials = PaymentProvider & {
  credentials: PaymentProviderCredential[];
};

@Injectable()
export class PaymentConfigRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Providers ───────────────────────────────────────────────────────────────

  findAllProviders(): Promise<PaymentProvider[]> {
    return this.prisma.paymentProvider.findMany({
      orderBy: { nome_exibicao: 'asc' },
    });
  }

  findProviderBySlug(slug: PaymentProviderSlug): Promise<ProviderWithCredentials | null> {
    return this.prisma.paymentProvider.findUnique({
      where: { slug },
      include: { credentials: true },
    });
  }

  updateProviderAtivo(slug: PaymentProviderSlug, ativo: boolean): Promise<PaymentProvider> {
    return this.prisma.paymentProvider.update({
      where: { slug },
      data: { ativo },
    });
  }

  updateWebhookSecret(slug: PaymentProviderSlug, encryptedSecret: string): Promise<PaymentProvider> {
    return this.prisma.paymentProvider.update({
      where: { slug },
      data: { webhook_secret: encryptedSecret },
    });
  }

  // ─── Credentials ─────────────────────────────────────────────────────────────

  /**
   * Upserts a single credential (encrypted value already set by the service layer).
   */
  upsertCredential(
    providerId: string,
    chave: string,
    valorCriptografado: string,
    ambiente: PaymentEnvironment,
  ): Promise<PaymentProviderCredential> {
    return this.prisma.paymentProviderCredential.upsert({
      where: {
        provider_id_chave_ambiente: { provider_id: providerId, chave, ambiente },
      },
      create: { provider_id: providerId, chave, valor: valorCriptografado, ambiente },
      update: { valor: valorCriptografado },
    });
  }

  deleteCredential(
    providerId: string,
    chave: string,
    ambiente: PaymentEnvironment,
  ): Promise<PaymentProviderCredential> {
    return this.prisma.paymentProviderCredential.delete({
      where: {
        provider_id_chave_ambiente: { provider_id: providerId, chave, ambiente },
      },
    });
  }

  findCredentialsByProvider(providerId: string): Promise<PaymentProviderCredential[]> {
    return this.prisma.paymentProviderCredential.findMany({
      where: { provider_id: providerId },
      select: { id: true, chave: true, ambiente: true, provider_id: true, valor: true } as Prisma.PaymentProviderCredentialSelect,
    });
  }

  // ─── Channel configs ─────────────────────────────────────────────────────────

  findAllChannelConfigs(): Promise<(PaymentChannelConfig & { provider: PaymentProvider })[]> {
    return this.prisma.paymentChannelConfig.findMany({
      include: { provider: true },
    });
  }

  upsertChannelConfig(
    canal: PaymentChannel,
    providerId: string,
    ambiente: PaymentEnvironment,
  ): Promise<PaymentChannelConfig> {
    return this.prisma.paymentChannelConfig.upsert({
      where: { canal },
      create: { canal, provider_id: providerId, ambiente },
      update: { provider_id: providerId, ambiente },
    });
  }

  // ─── Method mappings ─────────────────────────────────────────────────────────

  findAllMethodMappings(): Promise<(PaymentMethodMapping & { provider: PaymentProvider })[]> {
    return this.prisma.paymentMethodMapping.findMany({
      include: { provider: true },
      orderBy: [{ canal: 'asc' }, { metodo: 'asc' }],
    });
  }

  findMethodMappingById(id: string): Promise<PaymentMethodMapping | null> {
    return this.prisma.paymentMethodMapping.findUnique({ where: { id } });
  }

  upsertMethodMapping(data: {
    canal: PaymentChannel;
    metodo: PaymentMethodMapping['metodo'];
    provider_id: string;
    taxa_percentual: number;
    taxa_fixa_centavos: number;
  }): Promise<PaymentMethodMapping> {
    const { canal, metodo, provider_id, taxa_percentual, taxa_fixa_centavos } = data;
    return this.prisma.paymentMethodMapping.upsert({
      where: { canal_metodo: { canal, metodo } },
      create: { canal, metodo, provider_id, taxa_percentual, taxa_fixa_centavos },
      update: { provider_id, taxa_percentual, taxa_fixa_centavos },
    });
  }

  toggleMethodMapping(id: string, ativo: boolean): Promise<PaymentMethodMapping> {
    return this.prisma.paymentMethodMapping.update({
      where: { id },
      data: { ativo },
    });
  }

  // ─── Webhook events ───────────────────────────────────────────────────────────

  /**
   * Creates a webhook event record.
   * Returns null if an event with the same [provider, event_id] already exists (duplicate).
   */
  async createWebhookEvent(
    provider: PaymentProviderSlug,
    eventId: string,
    payload: Prisma.InputJsonValue,
  ): Promise<PaymentWebhookEvent | null> {
    try {
      return await this.prisma.paymentWebhookEvent.create({
        data: { provider, event_id: eventId, payload },
      });
    } catch (err) {
      // P2002 = unique constraint violation → duplicate event
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return null;
      }
      throw err;
    }
  }

  findWebhookEvent(
    provider: PaymentProviderSlug,
    eventId: string,
  ): Promise<PaymentWebhookEvent | null> {
    return this.prisma.paymentWebhookEvent.findUnique({
      where: { provider_event_id: { provider, event_id: eventId } },
    });
  }

  markWebhookEventProcessed(id: string): Promise<PaymentWebhookEvent> {
    return this.prisma.paymentWebhookEvent.update({
      where: { id },
      data: { processed: true },
    });
  }
}
