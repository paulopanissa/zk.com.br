# Arquitetura — Módulo LGPD

## Visão geral (antes → depois)

Antes: infraestrutura de PII (criptografia, consentimento, audit log) existe no módulo Clientes, mas não há gestão formal de solicitações de titulares nem canal DPO visível na API.

Depois: módulo `lgpd` com endpoints para DPO gerir solicitações formais (Arts. 18–20 LGPD), processar exportações e exclusões, e `dpo_email` exposto em CompanySettings (já existe no schema).

## Componentes afetados

- **Novo modelo:** `LgpdDataRequest` + enums `LgpdRequestType`, `LgpdRequestStatus`
- **Back-relations:** `Customer.lgpd_requests`, `Unit.lgpd_requests`
- **Nova migration:** `20260617131000_lgpd`
- **Novo módulo:** `apps/api/src/modules/lgpd/`
- **AppModule:** importar `LgpdModule`
- **CompanySettings:** `dpo_email` já existe — sem alteração de schema

## Modelo LgpdDataRequest

```prisma
enum LgpdRequestType { EXPORTACAO EXCLUSAO RETIFICACAO REVOGACAO_CONSENTIMENTO }
enum LgpdRequestStatus { PENDENTE EM_PROCESSAMENTO CONCLUIDA REJEITADA }

model LgpdDataRequest {
  id               String             @id @default(uuid())
  unidade_id       String
  customer_id      String
  tipo             LgpdRequestType
  status           LgpdRequestStatus  @default(PENDENTE)
  solicitado_em    DateTime           @default(now())
  prazo_legal      DateTime           // solicitado_em + 15 dias corridos
  processado_em    DateTime?
  processado_por   String?            // user_id do DPO
  justificativa    String?            @db.Text
  dados_exportados Json?              // payload compilado (somente tipo EXPORTACAO)
  created_at       DateTime           @default(now())
  updated_at       DateTime           @updatedAt

  unit     Unit     @relation(...)
  customer Customer @relation(...)

  @@index([unidade_id, status])
  @@index([customer_id])
}
```

## Endpoints

| Método | Rota | Role | Descrição |
|--------|------|------|-----------|
| `GET` | `/lgpd/requests` | ADMINISTRADOR | Listar solicitações (paginado, filtros: status, tipo, customer_id) |
| `POST` | `/lgpd/requests` | ADMINISTRADOR, OPERADOR_PDV | Criar solicitação em nome do titular |
| `GET` | `/lgpd/requests/:id` | ADMINISTRADOR | Detalhar solicitação |
| `PATCH` | `/lgpd/requests/:id/process` | ADMINISTRADOR | Processar → CONCLUIDA/REJEITADA |

## Lógica de processamento por tipo

| Tipo | Ação ao processar com CONCLUIDA |
|------|---------------------------------|
| `EXPORTACAO` | Compila Customer (PII decriptografada) + CustomerAuditLog → salva em `dados_exportados` |
| `EXCLUSAO` | Chama `anonymizeCustomer` no CustomersRepository |
| `RETIFICACAO` | Marca CONCLUIDA (edição de dados ocorre via PATCH /customers/:id) |
| `REVOGACAO_CONSENTIMENTO` | Seta `consentimento_lgpd = false`, nula `consentimento_versao` e `consentimento_em` no Customer |

## Campos derivados

- `prazo_vencido`: calculado na resposta — `prazo_legal < now() && status in [PENDENTE, EM_PROCESSAMENTO]`
- `prazo_legal`: `solicitado_em + 15 dias` (dias corridos, MVP; dias úteis em fase futura)

## Padrões mantidos

- Controller → Service → Repository; sem regra no controller
- TenancyService via @Global — sem import explícito no módulo
- `CustomersModule` exporta `CustomersService` → importar no `LgpdModule`
- DTOs com `class-validator`; whitelist global
- Guards `JwtSystemGuard` + `RolesGuard` via APP_GUARD global
- Swagger docs em todos os endpoints
- Escopo obrigatório: todas as queries filtram por `unidade_id`

## Principais arquivos a criar

- `apps/api/src/modules/lgpd/lgpd.module.ts`
- `apps/api/src/modules/lgpd/lgpd.controller.ts`
- `apps/api/src/modules/lgpd/lgpd.service.ts`
- `apps/api/src/modules/lgpd/lgpd.repository.ts`
- `apps/api/src/modules/lgpd/dto/create-request.dto.ts`
- `apps/api/src/modules/lgpd/dto/process-request.dto.ts`
- `apps/api/src/modules/lgpd/dto/query-requests.dto.ts`
- `apps/api/prisma/migrations/20260617131000_lgpd/migration.sql`
- `apps/api/src/app.module.ts` — adicionar LgpdModule

## Trade-offs

- Processamento síncrono (sem fila) — volume de solicitações LGPD é baixo; async via RabbitMQ pode ser adicionado no P2
- `dados_exportados` em JSON no banco — adequado para MVP; em produção poderia ser link S3 com TTL
- 15 dias corridos (não úteis) — simplificação declarada no MVP; fácil de ajustar depois
