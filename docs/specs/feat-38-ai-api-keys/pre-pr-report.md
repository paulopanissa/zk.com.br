# Pre-PR Review — feat/38 (AI API Keys)

**Data:** 2026-06-17
**Branch:** feat/38-ai-api-keys
**Revisor:** revisor-erp (agente)
**Status geral:** AMARELO — sem crítico bloqueador de segurança, mas há dois problemas que devem ser corrigidos antes do merge: mascaramento aplicado sobre ciphertext (não sobre o valor real) e credencial em plaintext no error body do provider remoto.

---

## Crítico (precisa corrigir)

### C1 — `stripKey` mascara o ciphertext, não o valor real da key

**Arquivo:** `apps/api/src/modules/ai-keys/ai-keys.service.ts`, linhas 266–269

```ts
function stripKey(key: AiApiKey): Omit<AiApiKey, 'key_encrypted'> & { key_masked: string } {
  const { key_encrypted, ...rest } = key;
  return { ...rest, key_masked: maskKey(key_encrypted) };
                                  // ^^^^ ciphertext, não o plaintext
}
```

`maskKey` recebe `key_encrypted` (o ciphertext AES-GCM no formato `{iv_hex}:{tag_hex}:{ciphertext_hex}`). O valor exibido ao usuário será algo como `7f3ab1...4e9c` — os primeiros 6 chars do IV e os últimos 4 do ciphertext — e não `sk-abc1...ef89` como a spec e o `context.md` documentam. O mascaramento não cumpre sua função de auditoria/conveniência, e pode criar a falsa impressão de que o campo retornado é o token real (parcialmente exposto).

**Correção:** `stripKey` deve descriptografar o valor **exclusivamente para mascaramento** e descartar o plaintext imediatamente. Alternativa sem descriptografar: armazenar separadamente um campo `key_prefix` (primeiros 6 chars do raw value) e `key_suffix` (últimos 4) no momento do `create`/`update`, e usar esses campos para montar `key_masked` sem nunca descriptografar no path de leitura. Esta segunda alternativa é mais segura pois evita que qualquer bug futuro exponha o plaintext completo em listagens.

---

### C2 — Plaintext da key pode aparecer no body da resposta HTTP do `testKey`

**Arquivo:** `apps/api/src/modules/ai-keys/ai-keys.service.ts`, linhas 381–387

```ts
const body = await res.text().catch(() => '');
error = `HTTP ${res.status}: ${body.slice(0, 200)}`;
```

Alguns provedores (especialmente OpenAI com chave inválida) retornam o valor da key recebida no body da resposta de erro:
```json
{"error":{"message":"Incorrect API key provided: sk-abc12...","type":"invalid_request_error"}}
```

Os primeiros 200 chars desse body são incluídos literalmente no campo `error` da resposta HTTP do endpoint `POST /ai-keys/:id/test`, que é retornada ao cliente e pode ser logada pelo interceptor global. Isso expõe o valor da credencial em texto claro na API response e nos logs.

**Correção:** Não inclua o corpo bruto do provider na resposta. Retorne apenas o status HTTP:
```ts
error = `HTTP ${res.status}`;
```
ou sanitize o body extraindo apenas campos que não contenham a key. Em hipótese alguma o body do provider deve ser enviado diretamente ao cliente.

---

## Aviso (deveria corrigir)

### A1 — `resolveActiveKey` retorna plaintext sem contexto de caller — risco de log acidental

**Arquivo:** `apps/api/src/modules/ai-keys/ai-keys.service.ts`, linhas 401–405

O método é público e exportado pelo módulo. Retorna `string` (a key em plaintext). Qualquer serviço que o consuma e lance uma exceção com a string (ex: `throw new Error(\`Falha ao chamar ${rawKey}\`)`  em algum módulo futuro) vai vazar a credencial nos logs. O método está correto em si, mas o contrato de uso é perigoso.

**Correção:** Envolva o plaintext em um value object opaco que não seja serializado por `JSON.stringify` nem por `console.log` acidentalmente:
```ts
class OpaqueApiKey {
  constructor(private readonly value: string) {}
  use(): string { return this.value; }
  toJSON() { return '[REDACTED]' }
  toString() { return '[REDACTED]' }
  [Symbol.for('nodejs.util.inspect.custom')]() { return '[REDACTED]' }
}
```
Alternativamente, document this risk with a `// SECURITY: caller must never log or serialize this value` comment e rastreie o uso com a skill `seguranca-lgpd`.

### A2 — `testKey` roda fetch síncrono dentro da requisição HTTP — trabalho pesado na request

**Arquivo:** `apps/api/src/modules/ai-keys/ai-keys.service.ts`, linha 374

A chamada ao provider externo (timeout de até 10 s) acontece dentro do ciclo de vida da request NestJS. O CLAUDE.md define como invariante não negociável: "Trabalho pesado vai pra fila. ... nunca dentro da requisição." Uma chamada externa de 10 s bloqueia a thread do event loop durante toda a espera (fetch é I/O, mas o servidor aguarda com a conexão HTTP do cliente aberta). Sob carga, N testes simultâneos mantêm N connections abertas por até 10 s cada.

**Correção:** Publicar um evento/job na fila e retornar `202 Accepted` com um `job_id`. O worker executa o teste e atualiza `last_tested_at/last_test_ok/last_test_latency_ms`. O cliente consulta o status via `GET /ai-keys/:id` depois.

### A3 — `testKey`: status HTTP 4xx interpretado como `ok = true`

**Arquivo:** `apps/api/src/modules/ai-keys/ai-keys.service.ts`, linha 380

```ts
ok = res.status < 500;
```

Status 401 (key inválida), 403 (key sem permissão) e 429 (rate limit) são `< 500` e são marcados como `ok = true`. O registro `last_test_ok = true` ficará incorreto para keys inválidas ou sem saldo.

**Correção:**
```ts
ok = res.status >= 200 && res.status < 300;
```

---

## Sugestão (bom ter)

### S1 — `create` faz `findAll` + filtro em memória para checar duplicata — redundante com unique constraint

**Arquivo:** `apps/api/src/modules/ai-keys/ai-keys.service.ts`, linhas 308–313

A verificação de duplicata (`keys.find(k => k.label === dto.label)`) carrega todos os registros do provider para memória e filtra em JS, enquanto o banco já tem `@@unique([unidade_id, provider, label])`. A exception `P2002` do Prisma seria lançada na `create` de qualquer forma. A query extra aumenta a latência e pode retornar um resultado stale em race condition.

**Correção:** Remova o check manual; capture `P2002` no service e lance `ConflictException` com a mensagem já existente.

### S2 — `findAll` na listagem não é paginada

**Arquivo:** `apps/api/src/modules/ai-keys/ai-keys.repository.ts`, linha 215

`prisma.aiApiKey.findMany` sem `take`/`skip`. Uma unidade com muitas keys não é o cenário típico, mas viola a convenção "Listagens sempre paginadas (page/limit)" do CLAUDE.md. Adicione paginação com defaults razoáveis (ex: `take: 50`).

### S3 — Endpoint `GET /ai-keys` aceita `provider` como query param sem validação de enum

**Arquivo:** `apps/api/src/modules/ai-keys/ai-keys.controller.ts`, linha 144

`@Query('provider') provider: AiProvider | undefined` — NestJS não aplica transformação/validação automática em query params simples sem `@IsEnum` em DTO com `ValidationPipe`. Um valor inválido como `provider=INVALID` é passado como string para o service e, dali, para o repository, onde o Prisma vai lançar um erro de banco em vez de um 400 limpo.

**Correção:** Mover o filtro `provider` para um `QueryAiKeyDto` com `@IsEnum(AiProvider) @IsOptional()` e `@Type(() => String)`.

---

## O que está correto

- **Criptografia:** `CryptoService.encrypt` (AES-256-GCM, IV random por operação, chave via `PII_ENCRYPTION_KEY` de env) é chamado antes de qualquer `INSERT`/`UPDATE`. Conforme.
- **Tenancy:** `resolveUnitId(user)` é a primeira chamada em todos os métodos do service. O `unitId` resultante é passado explicitamente a cada método do repository. `findById`, `findAll`, `update`, `delete` — todos filtram por `unitId` no `WHERE`. Conforme.
- **RBAC:** `@Roles(SystemRole.ADMINISTRADOR)` aplicado no nível da classe do controller. Todos os 6 endpoints herdam. Nenhum `@Public()` acidental. Conforme.
- **Valor nunca retornado diretamente:** `stripKey` remove `key_encrypted` antes de retornar ao controller. Conforme em intenção (ver C1 sobre a implementação do mascaramento).
- **Fetch com timeout:** `AbortSignal.timeout(10_000)` presente. Conforme.
- **Sem dado de cartão:** módulo apenas gerencia chaves de IA, sem superfície de pagamento. Não aplicável.
- **Separação de camadas:** controller sem lógica, service orquestra, repository concentra queries Prisma. Conforme.
- **Swagger:** todos os endpoints documentados com `@ApiOperation`, `@ApiTags`, `@ApiBearerAuth`, `@ApiQuery`. Conforme.
- **DTOs:** `class-validator` em `CreateAiKeyDto` e `UpdateAiKeyDto`. `whitelist: true` global intercepta campos extras. Conforme (ressalva S3).
- **Migration:** índice composto `(unidade_id, provider)` e unique `(unidade_id, provider, label)` presentes. FK para `units`. Conforme.
