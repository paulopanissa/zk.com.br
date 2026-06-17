# LGPD — Solicitações de Titulares, Exportação e Canal DPO (feat/22)

## FASE 1 — Schema + Migration [Não Iniciada ⏳]

### Tarefa A — schema.prisma [Não Iniciada ⏳]
Adicionar ao `apps/api/prisma/schema.prisma`:
1. Enums: `LgpdRequestType { EXPORTACAO EXCLUSAO RETIFICACAO REVOGACAO_CONSENTIMENTO }`, `LgpdRequestStatus { PENDENTE EM_PROCESSAMENTO CONCLUIDA REJEITADA }`
2. Model `LgpdDataRequest` com todos os campos (ver architecture.md)
3. Back-relations: `Customer.lgpd_requests LgpdDataRequest[]`, `Unit.lgpd_requests LgpdDataRequest[]`

### Tarefa B — Migration [Não Iniciada ⏳]
Criar `apps/api/prisma/migrations/20260617131000_lgpd/migration.sql`:
```sql
CREATE TYPE "LgpdRequestType" AS ENUM ('EXPORTACAO','EXCLUSAO','RETIFICACAO','REVOGACAO_CONSENTIMENTO');
CREATE TYPE "LgpdRequestStatus" AS ENUM ('PENDENTE','EM_PROCESSAMENTO','CONCLUIDA','REJEITADA');
CREATE TABLE "lgpd_data_requests" (
  "id" TEXT NOT NULL,
  "unidade_id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "tipo" "LgpdRequestType" NOT NULL,
  "status" "LgpdRequestStatus" NOT NULL DEFAULT 'PENDENTE',
  "solicitado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "prazo_legal" TIMESTAMP(3) NOT NULL,
  "processado_em" TIMESTAMP(3),
  "processado_por" TEXT,
  "justificativa" TEXT,
  "dados_exportados" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "lgpd_data_requests_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "idx_lgpd_requests_unidade_status" ON "lgpd_data_requests"("unidade_id", "status");
CREATE INDEX "idx_lgpd_requests_customer" ON "lgpd_data_requests"("customer_id");
ALTER TABLE "lgpd_data_requests" ADD CONSTRAINT "lgpd_data_requests_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "lgpd_data_requests" ADD CONSTRAINT "lgpd_data_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
```
Aplicar via `npx prisma migrate deploy` no diretório apps/api.

### Testes desta fase
- [ ] Migration aplica sem erros
- [ ] `pnpm --filter @zk/api prisma:generate` gera cliente Prisma com os novos tipos

## FASE 2 — Módulo LGPD [Não Iniciada ⏳]

### Tarefa A — DTOs [Não Iniciada ⏳]

**`dto/create-request.dto.ts`**:
```typescript
class CreateLgpdRequestDto {
  @IsUUID() customer_id: string
  @IsEnum(LgpdRequestType) tipo: LgpdRequestType
  @IsString() @IsOptional() @MaxLength(1000) descricao?: string
}
```

**`dto/process-request.dto.ts`**:
```typescript
class ProcessLgpdRequestDto {
  @IsEnum(LgpdRequestStatus) @IsIn([LgpdRequestStatus.CONCLUIDA, LgpdRequestStatus.REJEITADA]) status: LgpdRequestStatus
  @IsString() @IsOptional() @MaxLength(2000) justificativa?: string  // obrigatório se REJEITADA
}
```

**`dto/query-requests.dto.ts`**:
```typescript
class QueryLgpdRequestsDto {
  @IsEnum(LgpdRequestStatus) @IsOptional() status?: LgpdRequestStatus
  @IsEnum(LgpdRequestType) @IsOptional() tipo?: LgpdRequestType
  @IsUUID() @IsOptional() customer_id?: string
  @IsInt() @Min(1) @IsOptional() page: number = 1
  @IsInt() @Min(1) @Max(100) @IsOptional() limit: number = 20
}
```

### Tarefa B — Repository [Não Iniciada ⏳]

**`lgpd.repository.ts`**:
- `findAll(unitId, filters, pagination)` — paginado
- `findById(id, unitId)` — verifica escopo
- `create(data)` — insert
- `updateStatus(id, status, processadoPor, justificativa?, dadosExportados?)` — update com campos de processamento
- `revokeConsent(customerId)` — update Customer: consentimento_lgpd=false, null consentimento_versao/em

### Tarefa C — Service [Não Iniciada ⏳]

**`lgpd.service.ts`**:
- `listRequests(query, user)` — TenancyService.resolveUnitId, mapeia para response com `prazo_vencido`
- `createRequest(dto, user)` — valida customer pertence à unidade; cria com `prazo_legal = now + 15d`
- `getRequest(id, user)` — com `prazo_vencido`
- `processRequest(id, dto, user)`:
  - Se REJEITADA: validar justificativa obrigatória; update status
  - Se CONCLUIDA:
    - EXPORTACAO: buscar Customer (decrypt=true) + CustomerAuditLog → montar `dados_exportados`
    - EXCLUSAO: chamar `customersRepository.anonymizeCustomer(customerId, unitId)` 
    - RETIFICACAO: apenas status CONCLUIDA
    - REVOGACAO_CONSENTIMENTO: chamar `lgpdRepository.revokeConsent(customerId)` + status CONCLUIDA

### Tarefa D — Controller [Não Iniciada ⏳]

**`lgpd.controller.ts`**:
```
GET  /lgpd/requests           → @Roles(ADMINISTRADOR)
POST /lgpd/requests           → @Roles(ADMINISTRADOR, OPERADOR_PDV)
GET  /lgpd/requests/:id       → @Roles(ADMINISTRADOR)
PATCH /lgpd/requests/:id/process → @Roles(ADMINISTRADOR)
```

### Tarefa E — Module + AppModule [Não Iniciada ⏳]
- `lgpd.module.ts`: imports CustomersModule (para injetar CustomersService e acesso ao CustomersRepository)
- `app.module.ts`: adicionar LgpdModule

### Testes desta fase
- [ ] `pnpm --filter @zk/api exec tsc --noEmit` sem erros
- [ ] POST /lgpd/requests com customer válido → 201 com prazo_legal = agora+15d
- [ ] PATCH /lgpd/requests/:id/process com REJEITADA sem justificativa → 422
- [ ] PATCH /lgpd/requests/:id/process EXPORTACAO CONCLUIDA → dados_exportados preenchidos

## Invariantes críticos
- Escopo obrigatório: todas as queries filtram por `unidade_id`
- `dados_exportados` nunca retornados no GET /requests (listagem) — só em GET /requests/:id
- EXCLUSAO não deleta fisicamente — chama anonymizeCustomer
- `prazo_vencido` calculado em runtime, nunca persistido
- REJEITADA exige justificativa obrigatória (422 sem ela)

## Decisões tomadas
- Processamento síncrono (não enfileirado) — volume baixo de solicitações LGPD
- 15 dias corridos (não úteis) — MVP; documentado em plan.md
- `dados_exportados` em JSON no banco — adequado para MVP
- LgpdModule importa CustomersModule para reusar CustomersService (exportação) e Repository (anonymize)
