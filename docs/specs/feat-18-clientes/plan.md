# feat/18 — Clientes (spec 12)

## FASE 1 — Schema + Infra [Completada ✅]
- [x] Enums: CustomerFieldType, CustomerAuditAction
- [x] Models: CustomerFieldDefinition, Customer (PII encrypted), CustomerAuditLog
- [x] pg_trgm extension + GIN index on nome
- [x] Migration: 20260617124950_clientes
- [x] Prisma client gerado

## FASE 2 — Módulo customers [Em Progresso ⏰]
- [ ] utils/cpf-cnpj.validator.ts (modulo-11)
- [ ] customers.module.ts
- [ ] customers.controller.ts (11 endpoints)
- [ ] customers.service.ts (PII encrypt/decrypt, dynamic validation, anonymization, audit log)
- [ ] customers.repository.ts (pg_trgm search, hash lookup)
- [ ] DTOs (create/update/query/field-defs/reorder)

## FASE 3 — Integração + Compilação [Não Iniciada ⏳]
- [ ] app.module.ts: adicionar CustomersModule
- [ ] TypeScript compile check
- [ ] Revisor ERP + Auditor LGPD
- [ ] Commit + PR (Closes #18)

## Invariantes críticos deste módulo
- cpf_cnpj_enc e data_nascimento_enc NUNCA em texto claro no banco
- consentimento_lgpd obrigatório no create
- Anonymização (não exclusão física) ao DELETE
- Audit log em toda operação PII
- Escopo por unidade_id obrigatório (via TenancyService)
- Realm do sistema: nunca cruzar com e-commerce

## Decisões tomadas
- cpf_cnpj stored as cpf_cnpj_enc (encrypted) + cpf_cnpj_hash (HMAC-SHA256) para busca
- data_nascimento stored as data_nascimento_enc (encrypted ISO string)
- pg_trgm para busca fuzzy por nome (similarity > 0.3 OR ILIKE)
- Audit log fire-and-forget (void) para não bloquear respostas
