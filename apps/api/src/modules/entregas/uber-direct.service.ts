import * as crypto from 'crypto';
import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';

/** Credenciais descriptografadas do Uber Direct — nunca logadas ou retornadas em responses. */
export interface UberDirectCredentials {
  client_id: string;
  client_secret: string;
  customer_id: string;
  webhook_secret: string;
}

export interface UberQuotePayload {
  /** external_order_id = venda.id para idempotência */
  external_order_id?: string;
  pickup_address: string;
  dropoff_address: string;
  dropoff_phone_number: string;
  dropoff_name: string;
}

export interface UberQuoteResult {
  quote_id: string;
  /** Taxa de entrega em centavos (inteiro — Math.round aplicado) */
  fee_centavos: number;
  currency: string;
  duration_seconds: number;
  expires_at: Date;
}

export interface UberDeliveryPayload {
  quote_id?: string;
  /** external_order_id = venda.id para idempotência */
  external_order_id: string;
  pickup_address: string;
  dropoff_address: string;
  dropoff_phone_number: string;
  dropoff_name: string;
}

export interface UberDeliveryResult {
  id: string;
  status: string;
  tracking_url: string | null;
  courier?: Record<string, unknown>;
  fee?: number;
}

const UBER_TOKEN_URL = 'https://auth.uber.com/oauth/v2/token';
const UBER_API_BASE = 'https://api.uber.com/v1/customers';
/** TTL do token no Redis: 29 dias em segundos */
const TOKEN_TTL_SECONDS = 29 * 24 * 60 * 60;

@Injectable()
export class UberDirectService {
  private readonly logger = new Logger(UberDirectService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Obtém o token OAuth2 do Uber Direct, cacheando no Redis por 29 dias.
   * O token nunca é logado.
   *
   * @param credentials - Credenciais descriptografadas da config da unidade
   * @param unidadeId   - Chave do cache (isolamento por unidade)
   */
  async getToken(credentials: UberDirectCredentials, unidadeId: string): Promise<string> {
    const cacheKey = `delivery:uber:token:${unidadeId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return cached;

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: credentials.client_id,
      client_secret: credentials.client_secret,
      scope: 'eats.deliveries',
    });

    const res = await fetch(UBER_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.error(`Uber Direct token request failed: HTTP ${res.status}`);
      throw new InternalServerErrorException(
        'Falha ao obter token Uber Direct. Verifique as credenciais.',
      );
    }

    const data = (await res.json()) as { access_token: string; expires_in?: number };
    const token: string = data.access_token;

    // Cachear com TTL — token nunca vai para os logs
    await this.redis.set(cacheKey, token, TOKEN_TTL_SECONDS);
    return token;
  }

  /**
   * POST /delivery_quotes — cotação em tempo real.
   * Retorna fee_centavos como inteiro (Math.round).
   */
  async getQuote(
    token: string,
    customerId: string,
    payload: UberQuotePayload,
  ): Promise<UberQuoteResult> {
    const url = `${UBER_API_BASE}/${customerId}/delivery_quotes`;

    const body = {
      pickup_address: payload.pickup_address,
      dropoff_address: payload.dropoff_address,
      dropoff_phone_number: payload.dropoff_phone_number,
      dropoff_name: payload.dropoff_name,
      ...(payload.external_order_id ? { external_order_id: payload.external_order_id } : {}),
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      this.logger.warn(`Uber Direct quote failed: HTTP ${res.status} — ${errBody}`);
      throw new UnprocessableEntityException(
        'Não foi possível obter cotação de entrega. Verifique o endereço e tente novamente.',
      );
    }

    const data = (await res.json()) as {
      quote_id: string;
      fee: number;
      currency: string;
      duration: number;
      expires: string;
    };

    return {
      quote_id: data.quote_id,
      fee_centavos: Math.round(data.fee ?? 0),
      currency: data.currency ?? 'BRL',
      duration_seconds: data.duration ?? 0,
      expires_at: new Date(data.expires),
    };
  }

  /**
   * POST /deliveries — cria a entrega na Uber Direct.
   */
  async createDelivery(
    token: string,
    customerId: string,
    payload: UberDeliveryPayload,
  ): Promise<UberDeliveryResult> {
    const url = `${UBER_API_BASE}/${customerId}/deliveries`;

    const body: Record<string, unknown> = {
      external_order_id: payload.external_order_id,
      pickup_address: payload.pickup_address,
      dropoff_address: payload.dropoff_address,
      dropoff_phone_number: payload.dropoff_phone_number,
      dropoff_name: payload.dropoff_name,
    };
    if (payload.quote_id) {
      body['quote_id'] = payload.quote_id;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      this.logger.error(`Uber Direct createDelivery failed: HTTP ${res.status} — ${errBody}`);
      throw new InternalServerErrorException(
        'Falha ao criar entrega na Uber Direct. Tente novamente.',
      );
    }

    const data = (await res.json()) as {
      id: string;
      status: string;
      tracking_url?: string;
      courier?: Record<string, unknown>;
      fee?: number;
    };

    return {
      id: data.id,
      status: data.status,
      tracking_url: data.tracking_url ?? null,
      courier: data.courier,
      fee: data.fee,
    };
  }

  /**
   * GET /deliveries/{id} — consulta status de uma entrega.
   */
  async getDelivery(
    token: string,
    customerId: string,
    deliveryId: string,
  ): Promise<UberDeliveryResult> {
    const url = `${UBER_API_BASE}/${customerId}/deliveries/${deliveryId}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      this.logger.warn(`Uber Direct getDelivery failed: HTTP ${res.status} for id=${deliveryId}`);
      throw new InternalServerErrorException('Falha ao consultar entrega na Uber Direct.');
    }

    const data = (await res.json()) as {
      id: string;
      status: string;
      tracking_url?: string;
      courier?: Record<string, unknown>;
      fee?: number;
    };

    return {
      id: data.id,
      status: data.status,
      tracking_url: data.tracking_url ?? null,
      courier: data.courier,
      fee: data.fee,
    };
  }

  /**
   * Valida a assinatura HMAC SHA-256 do webhook Uber Direct.
   * Usa timingSafeEqual para evitar timing attacks.
   *
   * @param rawBody        - Body cru da requisição (Buffer)
   * @param signature      - Valor do header x-uber-signature
   * @param webhookSecret  - Segredo configurado no dashboard Uber Direct
   */
  verifyWebhookSignature(rawBody: Buffer, signature: string, webhookSecret: string): boolean {
    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    const expectedBuf = Buffer.from(expected, 'utf8');
    const receivedBuf = Buffer.from(signature, 'utf8');

    if (expectedBuf.length !== receivedBuf.length) return false;

    return crypto.timingSafeEqual(expectedBuf, receivedBuf);
  }
}
