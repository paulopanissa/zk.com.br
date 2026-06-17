import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Delivery, DeliveryConfig, DeliveryProvider, DeliveryStatus, Prisma } from '@prisma/client';
import { CryptoService } from '../../common/crypto/crypto.service';
import { JwtSystemPayload } from '../../common/auth/types/jwt-payload.type';
import { TenancyService } from '../../common/tenancy/tenancy.service';
import { EntregasRepository } from './entregas.repository';
import { UberDirectService, UberDirectCredentials } from './uber-direct.service';
import { CreateDeliveryConfigDto } from './dto/create-delivery-config.dto';
import { UpdateDeliveryConfigDto } from './dto/update-delivery-config.dto';
import { QuoteDeliveryDto } from './dto/quote-delivery.dto';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { UberWebhookPayload } from './dto/uber-webhook.dto';

/** Resultado de cotação de frete retornado ao frontend */
export interface QuoteResult {
  fee_centavos: number;
  eta_seconds: number;
  quote_id: string | null;
  expires_at: Date | null;
  provider: DeliveryProvider;
}

/** Mapeamento de status Uber Direct → DeliveryStatus interno */
const UBER_STATUS_MAP: Record<string, DeliveryStatus> = {
  pending: DeliveryStatus.PENDING,
  scheduled: DeliveryStatus.SCHEDULED,
  en_route_to_pickup: DeliveryStatus.EN_ROUTE_TO_PICKUP,
  arrived_at_pickup: DeliveryStatus.ARRIVED_AT_PICKUP,
  en_route_to_dropoff: DeliveryStatus.EN_ROUTE_TO_DROPOFF,
  arrived_at_dropoff: DeliveryStatus.ARRIVED_AT_DROPOFF,
  delivered: DeliveryStatus.COMPLETED,
  completed: DeliveryStatus.COMPLETED,
  failed: DeliveryStatus.FAILED,
  canceled: DeliveryStatus.CANCELED,
  cancelled: DeliveryStatus.CANCELED,
};

@Injectable()
export class EntregasService {
  private readonly logger = new Logger(EntregasService.name);

  constructor(
    private readonly repository: EntregasRepository,
    private readonly tenancy: TenancyService,
    private readonly crypto: CryptoService,
    private readonly uberDirect: UberDirectService,
  ) {}

  // ─── Config ──────────────────────────────────────────────────────────────────

  async createConfig(
    dto: CreateDeliveryConfigDto,
    user: JwtSystemPayload,
  ): Promise<Omit<DeliveryConfig, 'credentials_encrypted'>> {
    const unitId = await this.tenancy.resolveUnitId(user);

    const existing = await this.repository.findConfigByUnitId(unitId);
    if (existing) {
      throw new ConflictException(
        'Esta unidade já possui uma configuração de entrega. Use PATCH para atualizar.',
      );
    }

    const credentials: UberDirectCredentials = {
      client_id: dto.client_id,
      client_secret: dto.client_secret,
      customer_id: dto.customer_id,
      webhook_secret: dto.webhook_secret,
    };
    const credentialsEncrypted = this.crypto.encrypt(JSON.stringify(credentials));

    const config = await this.repository.createConfig({
      provider: DeliveryProvider.UBER_DIRECT,
      active: dto.active ?? true,
      credentials_encrypted: credentialsEncrypted,
      free_shipping_threshold_centavos: dto.free_shipping_threshold_centavos ?? null,
      unit: { connect: { id: unitId } },
    });

    return this.stripCredentials(config);
  }

  async updateConfig(
    dto: UpdateDeliveryConfigDto,
    user: JwtSystemPayload,
  ): Promise<Omit<DeliveryConfig, 'credentials_encrypted'>> {
    const unitId = await this.tenancy.resolveUnitId(user);

    const existing = await this.repository.findConfigByUnitId(unitId);
    if (!existing) {
      throw new NotFoundException(
        'Configuração de entrega não encontrada. Use POST para criar.',
      );
    }

    const updateData: Prisma.DeliveryConfigUpdateInput = {};

    // Atualiza credenciais somente se ao menos um campo foi enviado
    const hasCredentialUpdate =
      dto.client_id || dto.client_secret || dto.customer_id || dto.webhook_secret;

    if (hasCredentialUpdate) {
      // Descriptografa as existentes para mesclar apenas os campos enviados
      const existingCredentials = this.decryptCredentials(existing.credentials_encrypted);
      const merged: UberDirectCredentials = {
        client_id: dto.client_id ?? existingCredentials.client_id,
        client_secret: dto.client_secret ?? existingCredentials.client_secret,
        customer_id: dto.customer_id ?? existingCredentials.customer_id,
        webhook_secret: dto.webhook_secret ?? existingCredentials.webhook_secret,
      };
      updateData.credentials_encrypted = this.crypto.encrypt(JSON.stringify(merged));
    }

    if (dto.active !== undefined) updateData.active = dto.active;
    if (dto.free_shipping_threshold_centavos !== undefined) {
      updateData.free_shipping_threshold_centavos = dto.free_shipping_threshold_centavos;
    }

    const updated = await this.repository.updateConfig(unitId, updateData);
    return this.stripCredentials(updated);
  }

  async getConfig(user: JwtSystemPayload): Promise<Omit<DeliveryConfig, 'credentials_encrypted'>> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const config = await this.repository.findConfigByUnitId(unitId);
    if (!config) throw new NotFoundException('Configuração de entrega não encontrada.');
    return this.stripCredentials(config);
  }

  // ─── Quote ───────────────────────────────────────────────────────────────────

  /**
   * Cotação de frete em tempo real.
   * Se o total do carrinho atingir o threshold de frete grátis, retorna fee_centavos = 0
   * sem chamar a Uber Direct (provider = FRETE_GRATIS).
   */
  async quote(dto: QuoteDeliveryDto, user: JwtSystemPayload): Promise<QuoteResult> {
    const unitId = await this.tenancy.resolveUnitId(user);
    const config = await this.repository.findConfigByUnitId(unitId);
    if (!config || !config.active) {
      throw new NotFoundException('Configuração de entrega não encontrada ou inativa.');
    }

    // Regra de frete grátis
    if (
      config.free_shipping_threshold_centavos !== null &&
      config.free_shipping_threshold_centavos !== undefined &&
      dto.cart_total_centavos >= config.free_shipping_threshold_centavos
    ) {
      return {
        fee_centavos: 0,
        eta_seconds: 0,
        quote_id: null,
        expires_at: null,
        provider: DeliveryProvider.FRETE_GRATIS,
      };
    }

    const credentials = this.decryptCredentials(config.credentials_encrypted);
    const token = await this.uberDirect.getToken(credentials, unitId);

    const quoteResult = await this.uberDirect.getQuote(token, credentials.customer_id, {
      pickup_address: dto.pickup_address ?? '',
      dropoff_address: dto.dropoff_address,
      dropoff_phone_number: dto.recipient_phone,
      dropoff_name: '',
    });

    return {
      fee_centavos: quoteResult.fee_centavos,
      eta_seconds: quoteResult.duration_seconds,
      quote_id: quoteResult.quote_id,
      expires_at: quoteResult.expires_at,
      provider: DeliveryProvider.UBER_DIRECT,
    };
  }

  // ─── Create Delivery ─────────────────────────────────────────────────────────

  /**
   * Cria a entrega — normalmente chamado pelo worker após VendaEvent.DELIVERY_REQUESTED.
   * Idempotente por venda_id: se já existe entrega para a venda, retorna a existente.
   *
   * @param dto    - Dados da entrega
   * @param unitId - ID da unidade (vem do contexto do worker, não do cliente)
   */
  async createDelivery(dto: CreateDeliveryDto, unitId: string): Promise<Delivery> {
    // Idempotência: não criar duplicata para a mesma venda
    const existing = await this.repository.findDeliveryByVendaId(dto.venda_id);
    if (existing) {
      this.logger.log(`Entrega já existe para venda_id=${dto.venda_id} — retornando existente`);
      return existing;
    }

    const config = await this.repository.findConfigByUnitId(unitId);
    if (!config || !config.active) {
      throw new NotFoundException('Configuração de entrega não encontrada ou inativa.');
    }

    const credentials = this.decryptCredentials(config.credentials_encrypted);
    const token = await this.uberDirect.getToken(credentials, unitId);

    // Persiste com status PENDING antes de chamar a Uber (garante registro mesmo em caso de falha)
    const delivery = await this.repository.createDelivery({
      venda_id: dto.venda_id,
      provider: DeliveryProvider.UBER_DIRECT,
      status: DeliveryStatus.PENDING,
      uber_quote_id: dto.uber_quote_id ?? null,
      fee_centavos: dto.fee_centavos ?? 0,
      recipient_name: dto.recipient_name,
      recipient_phone: dto.recipient_phone,
      dropoff_address: dto.dropoff_address,
      pickup_address: dto.pickup_address,
      config: { connect: { id: config.id } },
      unit: { connect: { id: unitId } },
    });

    try {
      const uberResult = await this.uberDirect.createDelivery(token, credentials.customer_id, {
        external_order_id: dto.venda_id,
        quote_id: dto.uber_quote_id,
        pickup_address: dto.pickup_address,
        dropoff_address: dto.dropoff_address,
        dropoff_phone_number: dto.recipient_phone,
        dropoff_name: dto.recipient_name,
      });

      const updatedDelivery = await this.repository.updateDelivery(delivery.id, {
        uber_delivery_id: uberResult.id,
        tracking_url: uberResult.tracking_url ?? null,
        status: this.mapUberStatus(uberResult.status),
        fee_centavos: uberResult.fee ? Math.round(uberResult.fee) : delivery.fee_centavos,
        provider_response: uberResult as unknown as Prisma.InputJsonValue,
      });

      return updatedDelivery;
    } catch (err) {
      // Registra o erro no registro da entrega mas não remove o registro
      await this.repository.updateDelivery(delivery.id, {
        status: DeliveryStatus.FAILED,
        error_message: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  // ─── Webhook ─────────────────────────────────────────────────────────────────

  /**
   * Processa o webhook da Uber Direct.
   * - Valida a assinatura HMAC antes de qualquer processamento.
   * - Atualiza o status da entrega no banco.
   * - Sempre resolve sem lançar exceção (a Uber não deve receber erros internos).
   *
   * @param rawBody  - Body cru (Buffer) da requisição
   * @param signature - Valor do header x-uber-signature
   * @param unitId   - Unidade inferida da URL (parâmetro de rota)
   */
  async handleUberWebhook(
    rawBody: Buffer,
    signature: string,
    unitId: string,
  ): Promise<void> {
    const config = await this.repository.findConfigByUnitId(unitId);
    if (!config) {
      this.logger.warn(`Webhook recebido para unidade sem config: unitId=${unitId}`);
      return;
    }

    const credentials = this.decryptCredentials(config.credentials_encrypted);

    const isValid = this.uberDirect.verifyWebhookSignature(
      rawBody,
      signature,
      credentials.webhook_secret,
    );

    if (!isValid) {
      this.logger.warn(`Assinatura inválida no webhook Uber Direct para unitId=${unitId}`);
      throw new UnauthorizedException('Assinatura do webhook inválida.');
    }

    let payload: UberWebhookPayload;
    try {
      payload = JSON.parse(rawBody.toString('utf8')) as UberWebhookPayload;
    } catch {
      this.logger.error('Webhook Uber Direct: body não é JSON válido');
      return;
    }

    if (payload.kind !== 'dapi.status_changed') {
      // Evento não tratado — aceitar sem erro
      return;
    }

    const uberStatus: string = payload.meta?.status ?? '';
    const internalStatus = this.mapUberStatus(uberStatus);

    const delivery = await this.repository.findDeliveryByUberDeliveryId(payload.delivery_id, unitId);
    if (!delivery) {
      this.logger.warn(
        `Webhook Uber: entrega não encontrada para uber_delivery_id=${payload.delivery_id}`,
      );
      return;
    }

    await this.repository.updateDelivery(delivery.id, {
      status: internalStatus,
      provider_response: payload as unknown as Prisma.InputJsonValue,
    });

    this.logger.log(
      `Entrega ${delivery.id} atualizada para status=${internalStatus} via webhook`,
    );
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private decryptCredentials(encryptedJson: string): UberDirectCredentials {
    const json = this.crypto.decrypt(encryptedJson);
    return JSON.parse(json) as UberDirectCredentials;
  }

  /**
   * Remove credentials_encrypted do objeto antes de retornar ao controller.
   * Credenciais NUNCA devem aparecer em responses HTTP.
   */
  private stripCredentials(
    config: DeliveryConfig,
  ): Omit<DeliveryConfig, 'credentials_encrypted'> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { credentials_encrypted: _creds, ...safe } = config;
    return safe;
  }

  private mapUberStatus(uberStatus: string): DeliveryStatus {
    return UBER_STATUS_MAP[uberStatus.toLowerCase()] ?? DeliveryStatus.PENDING;
  }
}
