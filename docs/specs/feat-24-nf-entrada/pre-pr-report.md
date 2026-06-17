# Pre-PR Report — feat-24-nf-entrada

## revisor-erp

Data: 2026-06-17

### Critico (precisa corrigir)

**C1 — TOCTOU na confirmação: status verificado fora da transação / lot.create não atômico**
- Arquivo: `apps/api/src/modules/nf-entrada/nf-entrada.service.ts`, linhas 267-285 e 290-313
- O `nf.status` é lido e validado FORA do `$transaction` (linha 267-270), antes de entrar na transação (linha 285). Duas requisições simultâneas de `POST /:id/confirm` passam ambas pelo check de RASCUNHO antes de qualquer commit. Dentro da transação, o `lot.create` usa `findFirst` + `create` condicional (check-then-act, linhas 290-313), não atômico: ambas as transações concorrentes encontrarão `existingLot = null` e tentarão criar o mesmo lote, resultando em lotes duplicados. O `StockMovement.upsert` com `idempotency_key` evita duplicação do movement, mas o lote terá `quantity_received` duplicado.
- Correção: mover a leitura e a validação de status para DENTRO da transação e usar `tx.lot.upsert` (necessita `@@unique([unidade_id, product_id, code])` no schema) ou `createMany ... ON CONFLICT DO NOTHING`, para tornar a operação atômica.

**C2 — `updateItem` no repository não inclui `unidade_id` no WHERE**
- Arquivo: `apps/api/src/modules/nf-entrada/nf-entrada.repository.ts`, linha 138-143
- O método `updateItem` usa `where: { id: itemId, nf_entrada_id: nfId }` sem filtrar por `unidade_id`. O service faz um `findById(id, unitId)` antes (service linha 198), mas isso cria uma janela TOCTOU: a verificação de tenancy acontece antes da mutação, sem lock. Um item de outra unidade com o mesmo `itemId` + `nfId` poderia ser mutado se o NF for reparentado entre a leitura e o update.
- Correção: adicionar `nf_entrada: { unidade_id: unitId }` no `where` do `updateItem` (como já feito em `countUnlinkedItems` e `findItemsByNf`), e passar `unitId` como parâmetro.

### Aviso (deveria corrigir)

**A1 — CNPJ do emitente (XML) apenas validado por comprimento, não por dígito verificador**
- Arquivo: `apps/api/src/modules/nf-entrada/xml-parser.service.ts`, linhas 80-84
- O parser verifica apenas `emitCnpj.length !== 14`. A validação por DV só acontece em `resolveOrCreateSupplier` (service linha 363), que retorna `null` silenciosamente se o CNPJ for inválido — a NF é criada sem fornecedor sem qualquer aviso ao operador.
- Correção: chamar `validateCnpj(emitCnpj)` no parser e lançar `UnprocessableEntityException` se inválido, ou ao menos logar e retornar aviso no response.

**A2 — Campo `origem` (MANUAL/XML) ausente no modelo `NfEntrada`**
- Arquivo: `apps/api/prisma/schema.prisma`, model `NfEntrada` (linha 861)
- A skill `fiscal-br` especifica: "persista a origem (MANUAL ou XML)". O schema não tem esse campo. Sem ele não é possível distinguir, em auditoria, uma NF criada por XML de uma criada manualmente.
- Correção: adicionar `origem NfEntradaOrigem @default(MANUAL)` ao model e migration, e preenchê-lo em `createFromXml` e `create`.

### Sugestao (bom ter)

**S1 — `CreateNfDto` permite `items: []` (array vazio)**
- Arquivo: `apps/api/src/modules/nf-entrada/dto/create-nf.dto.ts`, linha 120
- Não há `@ArrayMinSize(1)`. Uma NF sem itens pode ser criada via `POST /nf-entrada`, o que vai gerar erros silenciosos em confirmação.
- Correção: adicionar `@ArrayMinSize(1)` ao campo `items`.

**S2 — `toMoney` usa `parseFloat` como intermediário**
- Arquivo: `apps/api/src/modules/nf-entrada/xml-parser.service.ts`, linhas 38-39
- `Math.round(parseFloat(val) * 100)` é o padrão adotado e protegido pelo `Math.round`. Para strings monetárias com mais de 12 dígitos significativos pode haver imprecisão de ponto flutuante. Considerar usar uma lib Decimal (ex: `big.js`) para a conversão.

---

*Revisão gerada pelo agente `revisor-erp` com base no commit `29cb31e`.*

## auditor-seguranca-lgpd

Data: 2026-06-17

### Alto

**SEC-1 — Multer sem limite de tamanho antes do parsing XML (DoS parcial)**
- Arquivo: `apps/api/src/modules/nf-entrada/nf-entrada.controller.ts`, linhas 41–55; `apps/api/src/modules/nf-entrada/nf-entrada.service.ts`, linhas 40–67
- `FileInterceptor('xml')` é chamado sem opções `limits: { fileSize }`. O parser XML (`xmlParser.parse(xmlBuffer)`, linha 40 do service) é executado ANTES de `storage.upload` (linha 59), que é onde o limite de tamanho (`FOLDER_MAX_SIZES.fiscal = 10 MB`) e a validação de MIME são aplicados. Um atacante autenticado como `OPERADOR_ESTOQUE_COMPRAS` pode enviar um payload XML arbitrariamente grande: Multer o aceita integralmente em memória, o parser o processa, e apenas depois a exceção de tamanho é lançada. O mesmo vale para `attachPdf` (controller linha 145, service linha 251–263).
- Correção: configurar `FileInterceptor('xml', { limits: { fileSize: 10 * 1024 * 1024 } })` (e análogo para o PDF) para rejeitar o upload na camada de transporte, antes de qualquer processamento. Mover a validação de MIME/tamanho para antes da chamada ao parser.

**SEC-2 — fast-xml-parser: `processEntities.maxTotalExpansions` é `Infinity` (risco de Billion Laughs / amplificação de entidades)**
- Arquivo: `apps/api/src/modules/nf-entrada/xml-parser.service.ts`, linhas 31–36; node_modules: `fast-xml-parser@5.9.2/src/xmlparser/OptionsBuilder.js`, linha 98
- O parser é instanciado sem configurar `processEntities`. O padrão da lib é `maxTotalExpansions: Infinity`, limitado apenas por `maxExpandedLength: 100000` caracteres por expansão. Um XML com entidades recursivamente aninhadas (Billion Laughs) pode amplificar o payload em memória e degradar o serviço mesmo dentro do limite de 10 MB declarado pelo storage — pois o parsing ocorre antes da validação de tamanho (ver SEC-1). Não há risco de XXE (a biblioteca não faz requisições HTTP/file para entidades externas), mas o DoS por expansão é real.
- Correção: instanciar o parser com `processEntities: { allowBooleanAttributes: false, maxTotalExpansions: 1000, maxExpandedLength: 50000 }`. Adicionar também `stopNodes: ['*.#text']` para evitar acúmulo em nós de texto. Esses limites são suficientes para NFe legítimas.

### Medio

**SEC-3 — CORS aberto (`app.enableCors()` sem restrição de origem)**
- Arquivo: `apps/api/src/main.ts`, linha 28
- `app.enableCors()` sem `origin` aceita requisições de qualquer domínio. Para um ERP com endpoints de NFe, lotes e movimentos de estoque, isso significa que qualquer página web maliciosa pode induzir o navegador de um usuário autenticado a realizar chamadas cross-origin com o cookie/token dele.
- Correção: definir `app.enableCors({ origin: process.env.ALLOWED_ORIGINS?.split(',') ?? false, credentials: true })` e injetar a variável de ambiente no deploy. Em produção, restringir apenas aos domínios do admin, PDV e e-commerce.

**SEC-4 — Helmet ausente: headers de segurança HTTP não configurados**
- Arquivo: `apps/api/src/main.ts` (ausência)
- O bootstrap não instala `helmet`. Headers como `X-Frame-Options`, `Content-Security-Policy`, `X-Content-Type-Options`, `Strict-Transport-Security` e `Referrer-Policy` não são enviados. Para um sistema ERP acessado por browser, isso abre vetores de clickjacking, MIME-sniffing e downgrade de protocolo.
- Correção: `import helmet from 'helmet'; app.use(helmet());` antes de `enableCors`. Considerar configuração conservadora de CSP.

**SEC-5 — `storage/signed-url`: parâmetro `key` sem validação de formato (path traversal no driver local)**
- Arquivo: `apps/api/src/common/storage/dto/signed-url-query.dto.ts`, linha 11; `apps/api/src/common/storage/drivers/local.driver.ts`, linha 47
- O campo `key` é decorado apenas com `@IsString()` — qualquer string é aceita. No driver local de desenvolvimento (`local.driver.ts`), `fullPath = path.join(this.basePath, key.replace(/\//g, path.sep))` não valida se o caminho resolvido permanece dentro de `basePath`. Um `key` com `../../apps/api/.env` não é protegido por `path.normalize` + verificação de prefixo. Em produção (S3/R2) esse vetor não existe, mas o driver local pode ser ativado acidentalmente (`STORAGE_DRIVER=local`). O endpoint requer `ADMINISTRADOR`, limitando o impacto.
- Correção: no `LocalDriver`, após `path.join`, verificar `if (!fullPath.startsWith(this.basePath + path.sep)) throw new UnprocessableEntityException(...)`. No DTO, adicionar `@Matches(/^[a-z0-9\-\/_.]+$/)` para restringir o formato de key a caracteres seguros.

### Baixo

**SEC-6 — Rate limiting global (60 req/min) pode não ser suficiente para upload de XML em brute-force**
- Arquivo: `apps/api/src/app.module.ts`, linha 4 (`ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }])`)
- 60 requisições por minuto por IP é suficiente para uso normal, mas endpoints de upload de arquivo (from-xml, attach-pdf) se beneficiariam de um limite específico mais restritivo (ex: 10/min) para reduzir a superfície de abuso por usuário autenticado com credenciais comprometidas.
- Correção: aplicar `@Throttle({ default: { limit: 10, ttl: 60000 } })` no nível do controller ou dos métodos `createFromXml` e `attachPdf`.

**SEC-7 — `chave_acesso` exposta no log de erro sem sanitização**
- Arquivo: `apps/api/src/modules/nf-entrada/nf-entrada.service.ts`, linhas 45–48 e 102–106
- As exceções `ConflictException` interpolam `parsed.chaveAcesso` diretamente na mensagem: `NF com chave de acesso ${parsed.chaveAcesso} já cadastrada nesta unidade`. A chave de acesso da NFe tem 44 dígitos e contém CNPJ, data e outros dados fiscais. Se a mensagem de erro for registrada em um log externo sem mascaramento, a chave ficará em claro nos logs.
- Correção: não incluir a chave completa na mensagem de erro de resposta; usar apenas os últimos 8 dígitos ou uma referência opaca. Garantir que o interceptor de log mascare campos fiscais.

---

### Itens Conformes

- **SQL injection (bulkSetBrand)**: `$executeRaw` usa tagged template literals com interpolação parametrizada (`${brandId}`, `${nfId}`, `${unitId}`) — Prisma converte para `$1/$2/$3` no driver. Zero concatenação de string. Conforme.
- **CNPJ auto-create supplier**: `resolveOrCreateSupplier` chama `validateCnpjCpf(cnpj)` (dígito verificador) antes de qualquer operação no banco; o CNPJ é extraído do XML já limpo de não-dígitos; `razaoSocial` é fatiada com `.slice(0, 200)`. Conforme.
- **Cross-unit isolation**: todas as queries do repository passam `unidade_id` (do contexto de tenancy, nunca de parâmetro do cliente). `bulkSetBrand` usa JOIN com `n.unidade_id = ${unitId}`. `findAll`, `findById`, `countUnlinkedItems`, `findItemsByNf` todos filtram por `unitId`. Conforme — ressalva de TOCTOU em `updateItem` já reportada pelo revisor-erp (C2).
- **Autenticação e RBAC**: `JwtSystemGuard` + `RolesGuard` registrados como `APP_GUARD` global. Cada endpoint do controller declara `@Roles(...)` explicitamente. Cancelamento restrito a `ADMINISTRADOR`. Conforme.
- **Validação de entrada**: `ValidationPipe` global com `whitelist: true` e `forbidNonWhitelisted: true`. DTOs com `class-validator` em todos os endpoints. `chave_acesso` validado por regex `^\d{44}$`. Conforme.
- **MIME validation por magic bytes**: `StorageService.validate` usa `file-type` para detectar MIME pelo conteúdo do buffer, ignorando o `Content-Type` declarado pelo cliente. Conforme — exceto pela ordem de execução descrita em SEC-1.
- **Path traversal no buildKey**: `buildKey` usa `randomUUID()` como nome de arquivo; do caller só extrai a extensão via `path.extname`. Nenhum componente de caminho do nome original é preservado. Conforme.
- **Segredos**: JWT secret e credenciais de storage lidos via `ConfigService.getOrThrow` de variáveis de ambiente. Nenhum segredo hardcoded nos arquivos auditados. Conforme.
- **Retenção fiscal**: `PROTECTED_FOLDERS` impede deleção de arquivos em `fiscal/xml` e `fiscal/pdf`. Conforme com obrigação de retenção de 5 anos.

*Auditoria gerada pelo agente `auditor-seguranca-lgpd`. Escopo: módulo `nf-entrada` e dependências diretas (storage, auth, validators).*
