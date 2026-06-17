# feat/15 — Config Impostos (spec 18) + Config Pagamentos (spec 16)

## FASE 1 — Schema + Infra [Completada ✅]
- [x] Enums: TipoImposto, BaseCalculo, TipoImpostoNcm, PaymentProviderSlug, PaymentEnvironment, PaymentChannel, PaymentMethod
- [x] Models: TaxProfile, TaxRate, NcmTaxOverride, PaymentProvider, PaymentProviderCredential, PaymentChannelConfig, PaymentMethodMapping, PaymentWebhookEvent
- [x] Prisma client gerado
- [x] Migration: tax_and_payment_config (running)
- [x] CryptoService + CryptoModule criados em common/crypto/

## FASE 2 — tax-config module [Em Progresso ⏰]
- [ ] tax-config.module.ts
- [ ] tax-config.controller.ts (14 endpoints)
- [ ] tax-config.service.ts (padrao constraint, effective-rates logic)
- [ ] tax-config.repository.ts
- [ ] DTOs (create/update/query)

## FASE 3 — payment-config module [Não Iniciada ⏳]
- [ ] payment-config.module.ts
- [ ] payment-config.controller.ts (12 endpoints + webhook)
- [ ] payment-config.service.ts (credential encryption, activate validation, webhook idempotency)
- [ ] payment-config.repository.ts
- [ ] DTOs

## FASE 4 — Integração + Compilação [Não Iniciada ⏳]
- [ ] app.module.ts: adicionar CryptoModule, TaxConfigModule, PaymentConfigModule
- [ ] .env.example: adicionar PII_ENCRYPTION_KEY, PII_HASH_KEY
- [ ] TypeScript compile check
- [ ] Commit + PR (Closes #15, Closes #16)

## Decisões tomadas
- CryptoModule é @Global para que Clientes (módulo 12) também use sem re-importar
- AES-256-GCM com IV random por criptografia; formato `{iv}:{tag}:{ciphertext}` todos em hex
- webhook_secret e credentials criptografados antes de INSERT, nunca retornados
- PaymentWebhookEvent armazena eventos para idempotência (unique [provider, event_id])
- tax-config sem tenancy (configuração global da empresa)
