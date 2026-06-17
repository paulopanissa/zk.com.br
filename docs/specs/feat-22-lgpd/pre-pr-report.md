# Pre-PR Report — feat-22-lgpd

## revisor-erp

**Status: AMARELO**

Dois problemas críticos e um aviso devem ser resolvidos antes do merge. Nenhum bloqueia deploy isolado, mas os itens 1 e 2 violam invariantes de tenancy e segurança de dados pessoais.

---

### Critico (precisa corrigir)

**1. `updateStatus` sem `unidade_id` no WHERE — TOCTOU de tenancy**

Arquivo: `apps/api/src/modules/lgpd/lgpd.repository.ts`, linha 106

```ts
return this.prisma.lgpdDataRequest.update({
  where: { id },   // <-- falta unidade_id
  ...
});
```

O service faz `findById(id, unitId)` antes de chamar `updateStatus`, mas o update final usa apenas `{ id }`. Sob concorrência (duas requisições simultâneas de unidades distintas para o mesmo `id`) ou em caso de futuro refactor que quebre a pré-verificação, este update pode alterar um registro de outra unidade. O invariante de tenancy exige que a camada de dados seja auto-suficiente: o `where` deve sempre incluir `unidade_id`.

Correção: adicionar `unidade_id` como parâmetro em `updateStatus` e incluí-lo no `where`:

```ts
updateStatus(id: string, unitId: string, status: ..., ...): Promise<LgpdDataRequest> {
  return this.prisma.lgpdDataRequest.update({
    where: { id, unidade_id: unitId },
    ...
  });
}
```

---

**2. `findCustomerAuditLogs` sem escopo de unidade — PII de outras unidades vazam no EXPORTACAO**

Arquivo: `apps/api/src/modules/lgpd/lgpd.repository.ts`, linha 137

```ts
findCustomerAuditLogs(customerId: string): Promise<CustomerAuditLog[]> {
  return this.prisma.customerAuditLog.findMany({
    where: { customer_id: customerId },  // <-- sem unidade_id
    ...
  });
}
```

O log de auditoria de cliente não filtra por unidade. Se `customer_id` pertencer a uma unidade e o request LGPD pertencer a outra (situação que a criação do request já impede, mas que pode surgir por dados inconsistentes ou bug futuro), todos os logs de qualquer unidade são incluídos no `dados_exportados`. Mesmo no caso normal, um `CustomerAuditLog` pode conter `ip_origem` e `usuario_id` de operadores — PII que deve estar vinculada à unidade correta.

Correção: `CustomerAuditLog` deve ter ou um campo `unidade_id` indexado, ou a query deve fazer join via `customer.unidade_id`. No mínimo, confirmar que o modelo `CustomerAuditLog` no schema Prisma tem `unidade_id` e filtrar por ele aqui.

---

**3. `revokeConsent` sem `unidade_id` no WHERE do customer update**

Arquivo: `apps/api/src/modules/lgpd/lgpd.repository.ts`, linha 119

```ts
return this.prisma.customer.update({
  where: { id: customerId },  // <-- falta unidade_id
  ...
});
```

A mesma lógica do item 1: o service já validou que o cliente pertence à unidade via `findById` + `findCustomerInUnit`, mas o `update` final não repete o guard de unidade. Revogar consentimento de um cliente de outra unidade por TOCTOU é violação de tenancy e de LGPD (processamento sem base legal da unidade processadora).

Correção: passar `unitId` para `revokeConsent` e incluir no `where: { id: customerId, unidade_id: unitId }`.

---

### Aviso (deveria corrigir)

**4. Audit log do EXPORTACAO disparado como fire-and-forget sem o IP da requisição LGPD**

Arquivo: `apps/api/src/modules/lgpd/lgpd.service.ts`, linha 127

```ts
const customerData = await this.customersService.exportCustomer(
  request.customer_id,
  user,   // <-- sem ip
);
```

`exportCustomer` aceita um terceiro argumento `ip?: string`. O service LGPD não propaga o IP do operador DPO que disparou o processamento. O log de auditoria de exportação fica sem `ip_origem`, o que reduz a rastreabilidade exigida pela LGPD para operações de acesso a dados sensíveis. O controller também não extrai o IP da requisição para repassar ao service.

Correção: extrair `@Ip()` no controller e propagar até `exportCustomer(..., ip)` e `deleteCustomer(..., ip)`.

---

### Sugestao (bom ter)

**5. `dados_exportados` usa `unknown` cast intermediário antes de `Prisma.InputJsonValue`**

Arquivo: `apps/api/src/modules/lgpd/lgpd.service.ts`, linha 164

```ts
dadosExportados as import('@prisma/client').Prisma.InputJsonValue
```

O cast inline de `unknown` para `Prisma.InputJsonValue` é frágil: se o objeto construído contiver `undefined` em algum campo aninhado (ex: `auditLogs` vazio retornando campo opcional), o Prisma rejeitará em runtime com erro de serialização. Recomenda-se tipar `dadosExportados` como `Record<string, unknown>` desde a declaração e garantir que nenhum valor seja `undefined` antes do cast.

---

### O que esta correto

- Tenancy em `findAll`, `findById`, `findCustomerInUnit` e `create`: todos filtram por `unidade_id` corretamente.
- RBAC: GET/PATCH restritos a `ADMINISTRADOR`; POST permite `ADMINISTRADOR` e `OPERADOR_PDV`. Guards globais (`JwtSystemGuard` + `RolesGuard`) registrados via `APP_GUARD`. Nenhuma rota publica por acidente.
- `deleteCustomer` chama `anonymizeCustomer` (soft-delete com dados zerados), nao `delete` fisico. Invariante de exclusao LGPD respeitado.
- `dados_exportados` excluido da listagem (`select: { dados_exportados: false }`) e retornado apenas no `findById`. Invariante de exposicao minima respeitado.
- Double-processing: verificacao de `CONCLUIDA | REJEITADA` antes de processar. Correto.
- `prazo_vencido` computado em memoria (`isPrazoVencido`), nunca persistido. Correto.
- `LgpdModule` importa `CustomersModule` para acesso a `CustomersService`. Correto.
- Validacao de `REJEITADA` sem `justificativa` retorna 422. Correto.
- DTOs com `class-validator`, `whitelist` global ativo, `ProcessLgpdRequestDto` restringe `status` a `CONCLUIDA | REJEITADA` via `@IsIn`. Correto.
- `exportCustomer` chamado com `(request.customer_id, user)` — `user` carrega `unitId` para resolucao de tenancy dentro do `CustomersService`. Correto.

---

## auditor-seguranca-lgpd

**Status: AMARELO**

Nenhum achado Critico novo. Dois achados Alto confirmam e ampliam os itens do revisor-erp. Tres achados Medio. A arquitetura central de seguranca (criptografia, RBAC, escopo de tenancy, minimizacao de PII) esta correta e funcional.

---

### Alto

**A1. `dados_exportados` armazenado como JSONB plaintext contem PII totalmente descriptografada**

Arquivo: `apps/api/src/modules/lgpd/lgpd.service.ts`, linhas 126–137; schema: `apps/api/prisma/schema.prisma`, linha 836

O campo `dados_exportados` e populado com o retorno de `exportCustomer` (que chama `toResponse(customer, decrypt=true)`) — incluindo `cpf_cnpj`, `data_nascimento`, `nome`, `email`, `telefone_principal` e campos dinamicos descriptografados — e persistido como `Json?` no PostgreSQL sem nenhuma camada adicional de criptografia. Qualquer acesso direto ao banco (dump, backup, acesso de DBA) expoe PII em claro. A criptografia em repouso da skill `seguranca-lgpd` se aplica ao dado armazenado, nao apenas ao dado em transito.

Avaliacao de aceitabilidade: o acesso ao endpoint esta restrito a `ADMINISTRADOR` e o campo e omitido da listagem — os controles de aplicacao estao corretos. O risco e de exposicao em nivel de banco/infra. Dependendo do modelo de ameaca (banco cifrado em disco, RLS, acesso de DBA auditado), pode ser aceitavel como risco residual registrado. Se o modelo de ameaca exigir protecao contra DBA, a correcao e criptografar o JSONB antes de persistir ou armazenar apenas um link para objeto no S3 criptografado (TTL curto).

Correco recomendada: criptografar `dados_exportados` com `CryptoService.encrypt(JSON.stringify(payload))` antes de persistir, armazenar como `String` no schema, e descriptografar apenas ao servir o `GET /requests/:id`. Alternativa menos invasiva: ativar `pgcrypto` com `gen_random_bytes` + `pgp_sym_encrypt` a nivel de banco.

---

**A2. EXCLUSAO e `updateStatus` nao sao atomicos — risco de estado inconsistente**

Arquivo: `apps/api/src/modules/lgpd/lgpd.service.ts`, linhas 141–165

A operacao de `EXCLUSAO` executa dois passos sequenciais sem transacao: (1) `customersService.deleteCustomer` anonimiza o cliente; (2) `repository.updateStatus` marca a solicitacao como `CONCLUIDA`. Se a etapa 2 falhar (erro de rede, timeout, excecao do Prisma), o cliente ja estara anonimizado mas a solicitacao permanecera em `PENDENTE`. Uma re-tentativa de processamento passara pela verificacao de status (nao e `CONCLUIDA | REJEITADA`) e tentara anonimizar novamente — o que e idempotente na pratica, mas o `findById` do `deleteCustomer` retornara `NotFoundException` porque o `deleted_at` ja foi preenchido e a query usa `deleted_at: null`. Isso causara uma excecao 404 ao tentar concluir uma solicitacao legitima.

O mesmo risco existe para `EXPORTACAO` (dados compilados, mas status nao atualizado) e `REVOGACAO_CONSENTIMENTO`.

Correco recomendada: envolver toda a logica de `processRequest` (acao de dominio + `updateStatus`) em uma transacao Prisma (`this.prisma.$transaction`) ou, para operacoes que chamam servicos externos, implementar idempotencia baseada em status atomico com `updateMany` e verificacao de linhas afetadas.

---

### Medio

**M1. `CORS` aberto sem restricao de origem**

Arquivo: `apps/api/src/main.ts`, linha 28

`app.enableCors()` sem opcoes habilita `Access-Control-Allow-Origin: *`. Em uma API autenticada de ERP, a origem deve ser restrita ao(s) dominio(s) dos frontends conhecidos. CORS aberto nao e uma vulnerabilidade direta (o token JWT ainda e necessario), mas aumenta a superficie de ataque para CSRF em browsers mais antigos e remove uma camada de defesa em profundidade.

Correco recomendada:
```ts
app.enableCors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? false, credentials: true });
```

---

**M2. `helmet` ausente — headers de seguranca HTTP nao configurados**

Arquivo: `apps/api/src/main.ts` (ausencia confirmada)

A skill `seguranca-lgpd` lista headers de seguranca (helmet) como requisito. Sem helmet, a API nao envia `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, entre outros. Para uma API RESTful pura (sem renderizacao HTML), o impacto e menor, mas `X-Content-Type-Options: nosniff` e `Strict-Transport-Security` sao relevantes mesmo para APIs JSON.

Correco recomendada: instalar `helmet` e adicionar `app.use(helmet())` antes de `enableCors` em `main.ts`.

---

**M3. Rate limiting global (60 req/min) sem override especifico nos endpoints de processamento LGPD**

Arquivo: `apps/api/src/app.module.ts`, linha 33; `apps/api/src/modules/lgpd/lgpd.controller.ts` (ausencia de `@Throttle`)

O `ThrottlerModule` esta configurado globalmente com `ttl: 60000, limit: 60`. O endpoint `PATCH /requests/:id/process` aciona operacoes destrutivas (`anonymizeCustomer`, `revokeConsent`) ou gera PII em claro (`dados_exportados`). Um limite de 60 req/min e adequado para APIs comuns, mas para endpoints que disparam efeitos irreversiveis (exclusao/anonimizacao), recomenda-se um limite mais conservador.

Correco recomendada: adicionar `@Throttle({ default: { ttl: 60000, limit: 5 } })` no metodo `processRequest` do controller.

---

### Baixo

**B1. `revokeConsent` nao emite `CustomerAuditLog` — rastreabilidade incompleta para REVOGACAO_CONSENTIMENTO**

Arquivo: `apps/api/src/modules/lgpd/lgpd.service.ts`, linhas 147–149; `apps/api/src/modules/lgpd/lgpd.repository.ts`, linhas 118–128

A revogacao de consentimento altera `consentimento_lgpd`, `consentimento_versao` e `consentimento_em` diretamente via `repository.revokeConsent`, sem passar pelo `customersService` e sem chamar `logAudit`. O `CustomerAuditLog` nao registra quem (usuario), quando e por que o consentimento foi revogado. A solicitacao LGPD em si registra a operacao no `processado_por` e `processado_em`, o que e um registro parcial, mas o log de auditoria do cliente permanece sem a entrada correspondente de `ATUALIZACAO` ou tipo especifico.

Correco recomendada: apos `revokeConsent`, chamar `customersService.updateCustomer` com os campos de consentimento, ou criar uma acao dedicada `REVOGACAO_CONSENTIMENTO` no enum `CustomerAuditAction` e emiti-la via `logAudit`.

---

### Conformidade confirmada (nao requer acao)

- **PII criptografada em repouso**: `cpf_cnpj_enc` e `data_nascimento_enc` usam AES-256-GCM com IV aleatorio; `cpf_cnpj_hash` usa HMAC-SHA256 com chave separada para busca — sem decriptacao em massa. Correto. (`apps/api/src/common/crypto/crypto.service.ts`)
- **Chaves de PII fora do codigo**: `PII_ENCRYPTION_KEY` e `PII_HASH_KEY` lidas via `ConfigService.getOrThrow` — ausencia da variavel mata a inicializacao. Sem segredos hardcoded no modulo.
- **Minimizacao**: cadastro orientado por `CustomerFieldDefinition` configuravel por unidade. Coleta limitada ao que a unidade define. Correto.
- **Consentimento versionado**: `consentimento_lgpd`, `consentimento_versao`, `consentimento_em` no schema; obrigatorio na criacao (`UnprocessableEntityException` se ausente). Correto.
- **Escopo de tenancy na criacao do request**: `findCustomerInUnit(dto.customer_id, unitId)` com `deleted_at: null` antes de criar — impede DPO criar solicitacao para cliente de outra unidade. Correto.
- **`dados_exportados` fora da listagem**: `select: { dados_exportados: false }` em `findAll` — PII nao vaza na listagem paginada. Correto. (`apps/api/src/modules/lgpd/lgpd.repository.ts`, linha 59)
- **Acesso a `dados_exportados` restrito**: `GET /requests/:id` exige `ADMINISTRADOR`; guards globais (`JwtSystemGuard`, `RolesGuard`) garantem autenticacao e RBAC em todas as rotas. Correto.
- **`processado_por` = `user.sub`**: UUID do operador, sem PII (nome, email) no campo. Correto. (`apps/api/src/modules/lgpd/lgpd.service.ts`, linha 163)
- **Ordem de EXCLUSAO**: `anonymizeCustomer` executado antes de `updateStatus(CONCLUIDA)` — cliente e anonimizado antes de fechar o request. Ordem logicamente correta (ressalva de atomicidade em A2).
- **EXCLUSAO nao e delete fisico**: `anonymizeCustomer` preenche campos com `[ANONIMIZADO]` e seta `deleted_at` — integridade referencial preservada. Correto.
- **Double-processing bloqueado**: verificacao de `CONCLUIDA | REJEITADA` antes de processar retorna 422. Correto.
- **Validacao de entrada**: DTOs com `class-validator`, `whitelist: true`, `forbidNonWhitelisted: true` global. `ProcessLgpdRequestDto` restringe `status` via `@IsIn`. `CreateLgpdRequestDto` usa `@IsUUID` para `customer_id`. Correto.
- **Sem SQL concatenado**: `LgpdRepository` usa exclusivamente Prisma Client (ORM parametrizado). Sem `$queryRaw` ou `$executeRaw` no modulo LGPD. Correto.
- **Realm de usuario correto**: modulo usa `JwtSystemPayload` (realm do sistema); nenhum cruzamento com realm de e-commerce. Correto.
- **Realms separados confirmados**: `JwtSystemGuard` aplicado globalmente via `APP_GUARD`. Correto.
