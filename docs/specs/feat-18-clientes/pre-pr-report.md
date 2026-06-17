# Pre-PR Report — feat/18 Clientes

## auditor-seguranca-lgpd

**Status global: 🟡 — Aprovado com ressalvas (3 achados a corrigir antes do merge)**

Data: 2026-06-17
Auditor: auditor-seguranca-lgpd (Claude)
Escopo: módulo customers — service, repository, controller, CryptoService, DTOs

---

### Achados por severidade

---

#### ALTO — cpf_cnpj_hash exposto na resposta da listagem

**Arquivo/linha:** `apps/api/src/modules/customers/customers.service.ts:27` e `:132–157`

`CustomerResponse` é definido como `Omit<Customer, 'cpf_cnpj_enc' | 'data_nascimento_enc'>`, mas **não omite `cpf_cnpj_hash`**. O método `listCustomers` retorna `CustomerPage` diretamente (sem passar por `toResponse`), expondo o campo `cpf_cnpj_hash` (HMAC-SHA256 do CPF/CNPJ) no payload JSON de todos os clientes listados.

Embora o hash não permita reverter o CPF, ele é um identificador determinístico vinculável entre sessões (fingerprinting de titular) — o que viola o princípio de minimização da LGPD e a política interna de exposição mínima.

**Correção recomendada:**
1. Adicionar `cpf_cnpj_hash` ao `Omit` do `CustomerResponse`.
2. Em `listCustomers`, mapear cada item de `CustomerPage.data` por `toResponse` antes de retornar, ou criar um tipo `CustomerListItem` sem o campo hash.

---

#### ALTO — Variável de ambiente `.env` com chaves reais de PII em desenvolvimento

**Arquivo/linha:** `apps/api/.env:29–30`

```
PII_ENCRYPTION_KEY="8f0231d7da01f8df1534cae4ab1fb3e4d32a7f7bfb133d45bf8d4d9c027eaaec"
PII_HASH_KEY="pii_test_2vZFVxN2hzaKsuuqBhthAhVXci56tyAu/WLZIsTny24="
```

O arquivo `.env` está no `.gitignore` (`apps/api/.env` é coberto pela regra `*.env`), portanto não será commitado — esse controle está correto. Porém, o arquivo existe em disco com valores que aparentam ser chaves reais (não placeholders). Se esta chave for reutilizada em produção e o arquivo for copiado inadvertidamente (ex.: build de imagem Docker sem `.dockerignore` adequado), os dados de PII ficam comprometidos.

**Correção recomendada:**
1. Rotacionar a chave `PII_ENCRYPTION_KEY` acima — trate-a como comprometida dado que está em texto claro num arquivo rastreável por IDE/editor/backup.
2. Adicionar `.dockerignore` explícito que exclua `apps/api/.env`.
3. Usar um valor claramente de placeholder no `.env` de desenvolvimento (ex.: `changeme_dev_only_never_use_in_production`).

---

#### MEDIO — ReDoS: regex de validação definida pelo usuário compilada sem proteção

**Arquivo/linha:** `apps/api/src/modules/customers/customers.service.ts:388`

```typescript
const regex = new RegExp(def.validacao_regex);
```

O campo `validacao_regex` é persistido pelo ADMINISTRADOR via `CreateFieldDefinitionDto` (sem restrição de conteúdo além de `@MaxLength(500)`) e depois compilado com `new RegExp(...)` a cada validação de campo dinâmico. Um padrão catastrófico como `(a+)+$` causa CPU backtracking exponencial (ReDoS), que pode travar o event loop do Node.js, derrubando o serviço.

**Correção recomendada:**
1. Validar o regex no momento da criação do `FieldDefinition` usando uma biblioteca safe-regex (ex.: `safe-regex2`) ou limitando os quantificadores permitidos via whitelist de sintaxe.
2. Alternativamente, executar o teste dentro de um Worker thread com timeout, ou usar a biblioteca `re2` (Google RE2 — sem backtracking).

---

#### MEDIO — Sem `@Max` no `limit` de paginação — risco de query massiva

**Arquivo/linha:** `apps/api/src/modules/customers/dto/query-customer.dto.ts:43–47`

```typescript
@IsInt()
@IsOptional()
@Min(1)
@Type(() => Number)
limit?: number = 20;
```

Não há `@Max(100)` (ou outro teto). Um usuário autenticado pode solicitar `limit=999999`, forçando um `LIMIT 999999` na query de listagem. Quando combinado com o `pg_trgm` (`findByNameTrgm`), que usa `$queryRaw` e passa `${take}` diretamente no template literal, o Postgres executará a query inteira antes de retornar.

**Correção recomendada:** Adicionar `@Max(100)` (ou o limite de negócio definido) ao decorador do campo `limit`.

---

#### BAIXO — Consent não atualizável no `UpdateCustomerDto`

**Arquivo/linha:** `apps/api/src/modules/customers/dto/update-customer.dto.ts` (ausência) e `customers.service.ts:244–300`

O `UpdateCustomerDto` não inclui campos de consentimento (`consentimento_lgpd`, `consentimento_versao`, `consentimento_em`). Isso significa que não existe endpoint para registrar um novo consentimento quando o titular aceita uma nova versão do termo. O dado de consentimento fica congelado na versão do cadastro, sem suporte ao ciclo de renovação previsto pelo Art. 7 da LGPD.

**Correção recomendada:** Criar um endpoint dedicado `PATCH /customers/:id/consent` que aceite `consentimento_versao` + `consentimento_em` + registre log de auditoria com ação `ATUALIZACAO` e detalhe `consentimento`, separando a atualização de dados cadastrais do ciclo de consentimento.

---

### Itens conformes (evidência para o release)

| Item | Evidência |
|------|-----------|
| AES-256-GCM com IV aleatório | `crypto.service.ts:25–31` — IV de 16 bytes gerado por `crypto.randomBytes`, tag GCM verificada no decrypt |
| Chave de PII carregada exclusivamente do env | `crypto.service.ts:17–22` — `config.getOrThrow` falha na inicialização se ausente; nenhum fallback hardcoded |
| HMAC-SHA256 determinístico para busca | `crypto.service.ts:48–53` — `hashForSearch` usa chave separada `PII_HASH_KEY`; nunca descriptografa em massa |
| CPF/CNPJ validado por módulo-11 antes de criptografar | `customers.service.ts:178–183` — `validateCpfCnpj` invocado; rejeita sem salvar se inválido |
| `cpf_cnpj_enc` e `data_nascimento_enc` nunca expostos por `toResponse` | `customers.service.ts:339` — desestruturação remove os campos; decrypt=false por padrão |
| Campos dinâmicos do tipo CPF_CNPJ também criptografados | `customers.service.ts:430–431` — `crypto.encrypt(digits)` aplicado antes de persistir |
| Consentimento obrigatório na criação (versão + timestamp) | `customers.service.ts:166–170`; `create-customer.dto.ts:60–75` — campos não-opcionais, checked no service |
| Anonimização preserva integridade referencial | `customers.repository.ts:224–239` — `deleted_at` setado, PII zerada, ID e FK preservados |
| Log de auditoria cobre CRIACAO, LEITURA, ATUALIZACAO, EXCLUSAO, EXPORTACAO | `customers.service.ts:212,228,292,312,326` — todas as operações logadas com `user_id` e IP |
| Log de auditoria sem PII em claro | `customers.repository.ts:243–253` — apenas `customer_id`, `acao`, `usuario_id`, `ip_origem`, `detalhe` (nome do campo, não valor) |
| Tabela `customer_audit_logs` é append-only no schema | `schema.prisma:791–804` — sem campo `updated_at`; código não tem `updateAuditLog` |
| Export endpoint restrito a ADMINISTRADOR | `customers.controller.ts:125` — `@Roles(SystemRole.ADMINISTRADOR)` |
| Guards globais (JWT + RBAC + Throttler) cobrem o controller | `app.module.ts:54–56` — três `APP_GUARD` registrados globalmente |
| Rate limiting global + reforçado no auth | `app.module.ts:31` — 60 req/min; `auth.controller.ts:20` — 10 req/min no login |
| Queries ORM parametrizadas na maior parte | `customers.repository.ts:137–168` — Prisma fluent API; `$queryRaw` com template literal tagged (parametrizado pelo Prisma) |
| `.env` não commitado | `.gitignore:9,12` — regras `*.env` e `.env` cobrem o arquivo |
| Realms separados (sistema x e-commerce) | `app.module.ts:25–26,55` — `JwtSystemGuard` só valida tokens do realm sistema; secrets diferentes por env |
| DTOs com `class-validator` e whitelist global ativa | `CLAUDE.md` + `create-customer.dto.ts`, `query-customer.dto.ts` — `ValidationPipe` global configurado |

