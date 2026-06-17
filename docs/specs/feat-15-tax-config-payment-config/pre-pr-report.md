# Pre-PR Review — feat/15 (Config Impostos + Config Pagamentos)

**Data:** 2026-06-17
**Branch:** feat/15-tax-config-payment-config
**Revisor:** revisor-erp (agente)
**Status geral:** AMARELO (nenhum crítico bloqueador, mas 2 avisos de segurança precisam ser corrigidos antes do merge)

---

## Crítico (precisa corrigir)

### C1 — Endpoint de webhook protegido por `@Roles(ADMINISTRADOR)` — gateway nunca chegará
**Arquivo:** `apps/api/src/modules/payment-config/payment-config.controller.ts`, linha 123–145

O endpoint `POST /payment-config/providers/:slug/webhook` está decorado com `@Roles(SystemRole.ADMINISTRADOR)`.
O `RolesGuard` global só passa quando o token JWT carrega o role `ADMINISTRADOR`. Nenhum gateway externo (Mercado Pago, Asaas, Stripe, etc.) enviará esse token — a chamada retornará 403 antes de qualquer verificação de assinatura.

Webhooks de gateway precisam ser públicos (sem autenticação de sistema) mas com autenticação por assinatura HMAC.
Corrija removendo `@Roles` deste endpoint e adicionando `@Public()` (que bypassa o `JwtSystemGuard`) mantendo a verificação de assinatura já implementada no service.

---

## Aviso (deveria corrigir)

### A1 — `webhook_secret` sem fluxo de gravação criptografada
**Arquivo:** `apps/api/src/modules/payment-config/payment-config.repository.ts` e `payment-config.service.ts`

O campo `PaymentProvider.webhook_secret` (coluna `TEXT` no banco) é descriptografado corretamente na verificação do webhook (`verifyWebhookSignature` descriptografa via `CryptoService.decrypt`). Porém não existe endpoint nem método de serviço para *gravar* o `webhook_secret` — o campo ficará `NULL` para todos os provedores, tornando a verificação de assinatura permanentemente inválida (`verifyWebhookSignature` retorna `false` quando `!provider.webhook_secret`).

Adicione um endpoint administrativo `PUT /payment-config/providers/:slug/webhook-secret` (ou inclua o campo no DTO de ativação) que receba o segredo em plaintext, o criptografe via `CryptoService.encrypt` e persista.

### A2 — Transform de alíquota aceita float em input; heurística da fronteira 100 é ambígua
**Arquivos:** `apps/api/src/modules/tax-config/dto/create-tax-rate.dto.ts` linha 20–24; `create-ncm-override.dto.ts` linha 25–28

```ts
@Transform(({ value }) => {
  const n = typeof value === 'string' ? parseFloat(value) : Number(value);
  return n < 100 ? Math.round(n * 100) : Math.round(n);
})
```

A lógica `n < 100 → n * 100` produz resultado errado para alíquota de exatamente 99% ou qualquer valor entre 99,01% e 99,99% enviado como inteiro (ex.: enviar `99` querendo dizer 99 centésimos de porcento produz `9900`, mas enviar `99` querendo dizer 99% também produz `9900` — ambíguo pelo lado de quem chama). Além disso, aceita `12.5` como float no wire, o que contraria o invariante "nunca float para dinheiro/alíquota".

Recomendação: remova o `@Transform` de conversão automática. Documente que a API aceita **somente inteiros em centésimos de porcento** e rejeite qualquer valor com casas decimais no JSON (`@IsInt` já faz isso se o Transform não converter antes). Se compatibilidade com clientes legados exigir a conversão, registre-a como trade-off em ADR.

---

## Sugestão (bom ter)

### S1 — `padrao` constraint resolvida via aplicação, não via índice único de banco
**Arquivo:** `apps/api/prisma/schema.prisma` / `apps/api/src/modules/tax-config/tax-config.service.ts`

A unicidade de "apenas um perfil padrão por `regime_tributario`" é garantida pelo service (`assertNoPaddingConflict`) mas não há índice/constraint no banco. Uma janela de concorrência (dois requests simultâneos criando perfis padrão) pode violar o invariante.

Adicione um **partial unique index** na migration:
```sql
CREATE UNIQUE INDEX tax_profiles_padrao_regime_uidx
  ON tax_profiles (regime_tributario)
  WHERE padrao = true;
```
O service pode continuar com a verificação antecipada para devolver um 409 legível, mas o banco é a última linha de defesa.

### S2 — `findCredentialsByProvider` inclui `valor` (criptografado) no select, mas o campo não é usado
**Arquivo:** `apps/api/src/modules/payment-config/payment-config.repository.ts`, linha 80

```ts
select: { id: true, chave: true, ambiente: true, provider_id: true, valor: true }
```

O método não é chamado por nenhum path do service atual. Quando for usado, incluir `valor` no retorno aumenta o risco de alguém, por engano, expor o ciphertext na resposta. Remova `valor: true` do select ou o método inteiro, pois `findProviderBySlug` já inclui `credentials` via `include` e é o que o service consome.

### S3 — Seeding inicial de provedores não está documentado
O schema cria os modelos mas não há seed para popular `payment_providers` com os slugs canônicos (MERCADO_PAGO, ASAAS, etc.). A validação de `MAQUININHA_POINT` depende do registro existir no banco com o `slug` correto. Adicione um seed ou note no README da migration como inicializar os registros.

---

## O que está correto (resumo positivo)

- **Alíquotas em inteiro:** `aliquota_percentual` é `Int` no schema e `@IsInt() @Min(0)` no DTO. Banco e DTO em conformidade com o invariante.
- **Criptografia no upsert de credenciais:** `upsertCredentials` do service chama `CryptoService.encrypt` antes do `repository.upsertCredential`. O repository recebe já o valor criptografado.
- **GET nunca descriptografa:** `toProviderDetail` retorna apenas `{ chave, ambiente, configurado: true }` — nenhum valor em plaintext ou ciphertext é exposto nas listagens.
- **Chave de criptografia via env:** `CryptoService.onModuleInit` usa `ConfigService.getOrThrow('PII_ENCRYPTION_KEY')` com validação de comprimento. Nenhum hardcode.
- **Idempotência de webhook:** `createWebhookEvent` usa constraint `UNIQUE (provider, event_id)` e captura `P2002` para retornar `duplicate: true` sem lançar erro.
- **MAQUININHA_POINT:** validação implementada no service antes do upsert.
- **Guard coverage:** `JwtSystemGuard` + `RolesGuard` são `APP_GUARD` global. Tax-config usa `@Roles(ADMINISTRADOR)` no nível da classe. Payment-config usa `@Roles(ADMINISTRADOR)` em cada método individualmente (equivalente).
- **Camadas respeitadas:** controller sem lógica, service orquestra invariantes, repository concentra queries Prisma.
- **Taxas monetárias:** `taxa_percentual` e `taxa_fixa_centavos` são `Int` no schema e `@IsInt() @Min(0)` no DTO.
