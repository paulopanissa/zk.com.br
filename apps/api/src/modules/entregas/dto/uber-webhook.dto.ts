/**
 * Tipos internos para o payload do webhook Uber Direct.
 * A validação do payload é feita via HMAC SHA-256 no header x-uber-signature,
 * não via class-validator (o body cru é necessário para recomputar a assinatura).
 *
 * Referência: evento principal = dapi.status_changed
 */
export interface UberWebhookPayload {
  /** Tipo de evento, ex: "dapi.status_changed" */
  kind: string;
  /** ID da entrega no Uber Direct */
  delivery_id: string;
  meta: {
    /** Status atual da entrega no lado Uber */
    status: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
