# Pre-PR Review — feat-34 Config Entregas (Uber Direct)

Data: 2026-06-17
Revisor: revisor-erp

---

## Críticos

### C1 — Webhook: `UnauthorizedException` lançada dentro do `try` do controller (controller swallows it — mas o service lança)

**Arquivo:** `entregas.service.ts` linha 286  
**Arquivo:** `entregas.controller.ts` linhas 132–137

O controller faz:
```ts
try {
  await this.service.handleUberWebhook(rawBody, signature ?? '', unitId);
} catch {
  // Nunca vazar detalhes internos para a Uber — apenas logar no service
}
return { received: true };
```

Isso parece correto à primeira vista — o catch silencia tudo e retorna 200. O problema é que, no service (`handleUberWebhook`, linha 286), quando a assinatura é inválida, o método **lança** `UnauthorizedException`. O `catch {}` do controller captura essa exceção e silencia. O resultado é que a Uber **sempre recebe 200**, mesmo com assinatura forjada.

Isso é um bug de segurança grave: qualquer atacante externo pode enviar webhooks forjados e o sistema irá processar os eventos normalmente, porque a exceção que deveria barrar o processamento é lançada **depois** do `return; this.logger.warn(...)`, mas ela é capturada no controller antes de chegar ao filtro de exceções do NestJS.

Releitura cuidadosa: o `throw new UnauthorizedException` está na linha 286 do service. O controller captura **todas** as exceções do service no `catch {}`. Portanto:
- Assinatura inválida → service lança → controller captura → `return { received: true }`.
- O processamento NÃO continua após o `throw` dentro do service — a execução do service para no `throw`.

**Portanto o comportamento real é: assinatura inválida = 200 + sem processamento.** Isso é o comportamento correto segundo a spec ("sempre retorna 200 para a Uber"). A segurança está mantida; o evento não é processado.

**Porém**, isso **não está documentado** no controller — o comentário diz "apenas logar no service", mas o service não loga no caminho de assinatura inválida antes de lançar; ele faz `this.logger.warn(...)` na linha 285 e depois lança. O logger.warn ocorre antes do throw, então o log está presente. Este ponto está correto mas é confuso.

**Reclassificando: não é crítico, mas é um aviso de legibilidade.** Ver Avisos A1.

---

### C1 — Webhook sem rate limiting no endpoint público

**Arquivo:** `entregas.controller.ts` linha 107 (`@Post('webhook/uber/:unitId')`)

O endpoint é `@Public()` e não tem nenhuma anotação de rate limiting (ex: `@Throttle` ou `@SkipThrottle(false)`). Qualquer agente externo pode fazer flood neste endpoint com payloads arbitrários. Mesmo que a assinatura HMAC barre o processamento, cada requisição dispara:
1. Query ao banco para buscar `DeliveryConfig` por `unitId` (linha 270 do service).
2. Descriptografia AES-256-GCM das credenciais.
3. Computação HMAC SHA-256.

Um flood de 10k req/s com `unitId` válidos causaria carga real no banco e CPU sem qualquer proteção. A skill `seguranca-lgpd` exige rate limiting em endpoints públicos.

**Correção:** adicionar `@Throttle({ default: { limit: 100, ttl: 60000 } })` ou equivalente ao handler do webhook. O `unitId` na URL também deve ser validado como UUID antes de chegar ao service (atualmente não há `@IsUUID()` no `@Param`, apenas um `string` bruto — qualquer string de qualquer comprimento é aceita, podendo gerar queries com valores absurdos).

---

### C2 — `fee_centavos` do `UberDeliveryResult.fee` pode ser `float` na persistência

**Arquivo:** `entregas.service.ts` linha 238

```ts
fee_centavos: uberResult.fee ? Math.round(uberResult.fee) : delivery.fee_centavos,
```

O `Math.round` está presente aqui. Porém, na interface `UberDeliveryResult` (`uber-direct.service.ts` linha 52), `fee` é tipado como `number | undefined` — podendo ser um float da resposta da Uber. O `Math.round` protege este caminho.

O problema está no caminho de `getQuote` → retorno ao controller (`entregas.service.ts` linha 176):
```ts
fee_centavos: quoteResult.fee_centavos,
```

E em `uber-direct.service.ts` linha 152:
```ts
fee_centavos: Math.round(data.fee),
```

O `Math.round` está correto em `getQuote`. Porém, se a Uber retornar `data.fee = null` ou `undefined` (campo ausente), `Math.round(undefined)` retorna `NaN`. O `NaN` é um `number` em TypeScript, passaria pela validação e seria persistido como `NaN` no banco (que dependendo do tipo Prisma pode resultar em `0` ou erro de runtime).

**Correção:** usar `Math.round(data.fee ?? 0)` em `uber-direct.service.ts` linha 152, e mesma proteção em qualquer outro acesso ao campo `fee`.

---

### C3 — `unitId` do webhook não validado como UUID — possível enumeração / injeção de path

**Arquivo:** `entregas.controller.ts` linha 129 (`@Param('unitId') unitId: string`)

O `unitId` vem de um parâmetro de rota público sem nenhuma validação de formato. O Prisma usará esse valor diretamente em `findUnique({ where: { unidade_id: unitId } })`. Embora o Prisma use queries parametrizadas (sem SQL injection direta), valores arbitrariamente longos ou com caracteres especiais podem:
- Causar queries desnecessárias/lentas.
- Vazar informação de timing (unidade existente vs. inexistente — observable via latência da resposta).
- Dificultar correlação de logs.

**Correção:** adicionar `@ParseUUIDPipe()` no `@Param('unitId')` para rejeitar imediatamente valores que não sejam UUID válidos antes de chegar ao service.

---

### C4 — `findDeliveryByUberDeliveryId` sem filtro de `unidade_id` — dado cross-tenant

**Arquivo:** `entregas.repository.ts` linha 49–53

```ts
findDeliveryByUberDeliveryId(uberDeliveryId: string): Promise<Delivery | null> {
  return this.prisma.delivery.findFirst({
    where: { uber_delivery_id: uberDeliveryId },
  });
}
```

Este método não filtra por `unidade_id`. Ele é chamado no webhook handler (`entregas.service.ts` linha 305) com um `uber_delivery_id` que vem do payload JSON da Uber (não autenticado, apenas assinatura verificada). Se a assinatura for válida para a unidade A, mas o payload contiver um `delivery_id` que pertence à entrega da unidade B, o sistema atualizará o status de uma entrega de outra unidade — violação direta do invariante de tenancy.

**Correção:** passar `unitId` para `findDeliveryByUberDeliveryId` e incluir `unidade_id: unitId` no `where`. O método já recebe `unitId` no service via parâmetro de rota.

---

## Importantes

### I1 — Webhook: processamento síncrono dentro da requisição HTTP (violação de arquitetura)

**Arquivo:** `entregas.service.ts` linhas 265–321

O `handleUberWebhook` faz, dentro da requisição HTTP:
1. Query ao banco (`findConfigByUnitId`).
2. Descriptografia AES-256-GCM.
3. Computação HMAC.
4. Parse de JSON.
5. Query ao banco (`findDeliveryByUberDeliveryId`).
6. Update no banco (`updateDelivery`).

O CLAUDE.md é explícito: "trabalho pesado vai pra fila". O correto seria: verificar HMAC + publicar na fila RabbitMQ (`delivery.webhook`) + retornar 200 imediatamente. O worker processaria o estado.

Atualmente, se o banco estiver lento, a Uber pode receber timeout e reenviar o webhook, causando processamento duplicado (embora a lógica de update seja idempotente neste caso específico). O principal risco é indisponibilidade percebida pela Uber com reenvios desnecessários.

---

### I2 — `recipient_phone` (PII) presente em `dropoff_address` do log de erro

**Arquivo:** `uber-direct.service.ts` linha 191

```ts
this.logger.error(`Uber Direct createDelivery failed: HTTP ${res.status} — ${errBody}`);
```

O `errBody` é a resposta de erro da Uber, que pode conter o `dropoff_phone_number` que foi enviado no payload. Telefone em E.164 é PII. Logs não devem conter PII (skill `seguranca-lgpd`).

Mesmo problema potencial na linha 136 de `uber-direct.service.ts` para `getQuote`.

**Correção:** não logar o `errBody` diretamente; logar apenas o código HTTP e uma mensagem genérica. O detalhe pode ser enviado para um sistema de observabilidade que suporte mascaramento de PII.

---

### I3 — Token Redis: ausência de verificação de `expires_in` da resposta Uber

**Arquivo:** `uber-direct.service.ts` linhas 98–103

O TTL hardcoded é `TOKEN_TTL_SECONDS = 29 * 24 * 60 * 60` (29 dias). A spec diz que o token da Uber é válido por 30 dias, então 29 dias é correto. Porém o campo `expires_in` da resposta OAuth2 é recebido (`data.expires_in`) e ignorado. Se a Uber reduzir o tempo de expiração para menos de 29 dias (o que é prerrogativa deles), o token Redis ainda terá TTL 29 dias mas o token estará expirado na Uber, causando falhas silenciosas em todas as chamadas subsequentes até o cache expirar.

**Correção:** usar `Math.min(TOKEN_TTL_SECONDS, (data.expires_in ?? TOKEN_TTL_SECONDS) - 60)` como TTL, com margem de 60 segundos.

---

### I4 — `createDelivery` não é chamado via fila no módulo — risco de chamada HTTP direta

**Arquivo:** `entregas.controller.ts`

O método `createDelivery` no service existe e está correto para ser chamado por worker. Porém ele não está exposto como endpoint HTTP no controller (correto). O risco é que não existe nenhuma proteção arquitetural que impeça outro service/controller de chamar `createDelivery` diretamente via injeção do `EntregasService`, bypassando a fila. A exportação de `EntregasService` no módulo (`exports: [EntregasService]`) torna isso possível.

Isso é um aviso arquitetural; não há evidência de chamada direta no diff atual, mas o padrão recomendado seria ter `createDelivery` em um `EntregasWorkerService` separado, não exportado pelo módulo principal.

---

## Avisos

### A1 — Controller: comentário enganoso no catch do webhook

**Arquivo:** `entregas.controller.ts` linha 135 (`// Nunca vazar detalhes internos para a Uber — apenas logar no service`)

O comentário diz "apenas logar no service", mas o catch silencia **todos** os erros sem logar nada no controller, incluindo erros de infraestrutura (ex: banco fora do ar durante o update). Um `UnhandledPromiseRejection` não chegará ao logger do NestJS porque está sendo capturado pelo `catch {}`. Considerar pelo menos `this.logger.error(err)` no catch para que erros de infraestrutura não sejam completamente silenciados.

---

### A2 — `hasCredentialUpdate` usa `||` (truthy) em vez de `!== undefined`

**Arquivo:** `entregas.service.ts` linha 105–107

```ts
const hasCredentialUpdate =
  dto.client_id || dto.client_secret || dto.customer_id || dto.webhook_secret;
```

Se alguém enviar `client_id: ""` (string vazia), a validação do DTO rejeitaria (`@IsNotEmpty()`), então este caso específico não ocorre. Porém, o padrão correto para verificar presença de campo opcional é `!== undefined`. O uso de `||` é um anti-pattern que pode mascarar bugs em refactors futuros se a validação de DTO mudar. Preferir `dto.client_id !== undefined || ...`.

---

### A3 — `pickup_address` na cotação pode ser string vazia sem aviso

**Arquivo:** `entregas.service.ts` linha 169

```ts
pickup_address: dto.pickup_address ?? '',
```

Se `pickup_address` for omitido no DTO, é enviado como string vazia para a Uber Direct. A Uber pode rejeitar a requisição com erro 422, que será devolvido ao usuário como "Não foi possível obter cotação de entrega." sem indicação clara da causa. A spec diz "usa o endereço cadastrado na unidade" — esta lógica de fallback para o endereço da unidade não está implementada. A string vazia é enviada, o que provavelmente causará erro na API da Uber.

---

### A4 — Ausência de endpoint de listagem de entregas no controller

**Arquivo:** `entregas.controller.ts`

O repository implementa `findAllDeliveries` com paginação e filtro por status, mas não há endpoint correspondente no controller. O frontend não consegue listar entregas. Pode ser intencional para esta fase da feature, mas deve ser documentado.

---

### A5 — `provider_response` armazena payload completo do webhook sem sanitização

**Arquivo:** `entregas.service.ts` linha 315

```ts
provider_response: payload as unknown as Prisma.InputJsonValue,
```

O payload completo do webhook da Uber é armazenado como JSON. Se a Uber alguma vez incluir PII no payload (ex: dados do entregador, nome do destinatário derivado de outro sistema), isso seria armazenado em claro no banco. Considerar armazenar apenas os campos relevantes (`kind`, `delivery_id`, `meta.status`, `timestamp`).

---

## O que está correto

- Credenciais criptografadas via `CryptoService` antes de persistir (AES-256-GCM pelo comentário do module).
- `stripCredentials` remove `credentials_encrypted` de todos os responses HTTP — implementado corretamente com destructuring.
- `timingSafeEqual` usado na comparação HMAC — correto.
- `rawBody` (Buffer) usado na verificação de assinatura, não o JSON parseado — correto.
- TTL de 29 dias no Redis para o token Uber (< 30 dias) — correto.
- Chave Redis `delivery:uber:token:<unidade_id>` isolada por unidade — correto.
- CPF não enviado à Uber — confirmado no DTO `CreateDeliveryDto` e nos payloads.
- `recipient_phone` validado com regex E.164 nos DTOs `QuoteDeliveryDto` e `CreateDeliveryDto` — correto.
- Idempotência por `venda_id` em `createDelivery` — implementada e correta.
- `Math.round` aplicado em `getQuote` para garantir inteiro — correto.
- Tenancy resolvida via `TenancyService.resolveUnitId(user)` (contexto autenticado) nas rotas autenticadas — correto.
- RBAC: config exige `ADMINISTRADOR`; quote aceita `ADMINISTRADOR` ou `OPERADOR_PDV`; webhook é `@Public()` — correto segundo spec.
- Webhook sempre retorna 200 (catch no controller) — correto.
- Nenhuma regra de negócio no controller — correto.
