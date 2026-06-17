# Context — Config Entregas (Uber Direct)

## Motivação
PRD Spec 17. Unidades precisam configurar entrega local same-day para o e-commerce.
Uber Direct está disponível em 180+ municípios brasileiros com cotação em tempo real via API.

## Uber Direct API

- **Auth**: OAuth2 `client_credentials`, scope `eats.deliveries`
  - Token endpoint: `https://auth.uber.com/oauth/v2/token`
  - Validade: 30 dias — cachear no Redis, TTL 29 dias
  - Credenciais: `client_id`, `client_secret`, `customer_id`
- **Base URL**: `https://api.uber.com/v1/customers/<customer_id>/`
- **Fluxo**:
  1. `POST /delivery_quotes` → `quote_id` (válido 15 min) + fee em centavos + ETA
  2. `POST /deliveries` (passando `quote_id`) → `id` + `tracking_url`
  3. `GET /deliveries/<id>` ou webhooks para status
- **Webhook**: `POST` configurado no dashboard Uber Direct, valida via HMAC SHA-256 (`x-uber-signature`)
  - Usar `RawBody` no handler NestJS (não parsear body antes da verificação)
  - Evento principal: `dapi.status_changed` com campo `meta.status`
- **Idempotência**: campo `external_order_id` = `venda.id`

## Decisões de Arquitetura

1. **Credenciais criptografadas** em campo `credentials_encrypted` (JSON com client_id/secret/customer_id/webhook_secret)
2. **Token cacheado no Redis** — key `delivery:uber:token:<unidade_id>`, TTL 29 dias
3. **Criação de entrega via fila** — checkout publica `delivery.create` no RabbitMQ, worker cria na Uber
4. **Cotação é síncrona** — feita em tempo real no checkout para mostrar preço ao cliente (15 min de janela)
5. **Frete grátis** — regra simples: `cart_total_centavos >= free_shipping_threshold_centavos`
6. **LGPD** — não enviar CPF; apenas nome, telefone (E.164), endereço; base legal = execução de contrato

## Status de status Uber Direct

SCHEDULED → EN_ROUTE_TO_PICKUP → ARRIVED_AT_PICKUP → EN_ROUTE_TO_DROPOFF → ARRIVED_AT_DROPOFF → COMPLETED/FAILED
