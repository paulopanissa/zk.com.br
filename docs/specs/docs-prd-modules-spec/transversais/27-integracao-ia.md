# 27. Integração de IA

**Domínio:** Transversal & Infraestrutura
**Prioridade:** P1
**Path NestJS:** `apps/api/src/common/ai/`

---

## Responsabilidade

Prover um serviço transversal de geração de conteúdo via LLM (OpenAI, DeepSeek, Google etc.) para automatizar a criação de descrições de produto, metadados de SEO e Schema.org, consumindo as API Keys configuradas no módulo 19.

## Entidades / Interfaces

Este módulo não possui tabelas próprias. Persiste apenas o conteúdo gerado nas entidades dos módulos proprietários (ex: `products.description`, `products.seo_title`).

### Contratos internos

```typescript
interface AiGenerationRequest {
  provider: AiProvider              // provedor a usar
  model: string                     // ex: "gpt-4o-mini", "deepseek-chat"
  prompt: string
  max_tokens?: number               // padrão: 1024
  temperature?: number              // padrão: 0.7
}

interface AiGenerationResult {
  provider: AiProvider
  model: string
  content: string
  usage: {
    input_tokens: number
    output_tokens: number
  }
  generated_at: Date
}

enum AiProvider {
  OPENAI   = 'openai',
  DEEPSEEK = 'deepseek',
  GOOGLE   = 'google',
}

// Contratos de geração de conteúdo de produto
interface ProductContentRequest {
  product_id: uuid
  fields: ProductContentField[]     // quais campos gerar
  provider?: AiProvider             // se omitido, usa o provedor padrão configurado
}

enum ProductContentField {
  DESCRIPTION        = 'description',
  SEO_TITLE          = 'seo_title',
  SEO_DESCRIPTION    = 'seo_description',
  SCHEMA_ORG         = 'schema_org',
}

interface ProductContentResult {
  product_id: uuid
  generated: Partial<Record<ProductContentField, string>>
  provider: AiProvider
  model: string
}
```

### Interface do AiService

```typescript
abstract class AiService {
  generate(request: AiGenerationRequest): Promise<AiGenerationResult>
  generateProductContent(request: ProductContentRequest): Promise<ProductContentResult>
  generateProductContentBatch(productIds: uuid[], fields: ProductContentField[]): Promise<void>  // enfileira
  getAvailableProviders(): AiProvider[]
}
```

## Endpoints / API Pública

| Método | Path | Descrição | Autenticação |
|--------|------|-----------|--------------|
| POST | `/ai/products/:id/generate` | Gerar conteúdo para um produto específico | Bearer (system) + ADMINISTRADOR |
| POST | `/ai/products/generate-batch` | Enfileirar geração em massa para múltiplos produtos | Bearer (system) + ADMINISTRADOR |
| GET | `/ai/providers` | Listar provedores configurados e disponíveis | Bearer (system) + ADMINISTRADOR |

## Regras de Negócio

- O serviço consome API Keys armazenadas no módulo 19 (`api-keys-ia`). Nunca usa chaves hardcoded ou de variáveis de ambiente próprias — as chaves são gerenciadas pelo administrador na plataforma.
- Geração de conteúdo para **produto único** (`POST /ai/products/:id/generate`): pode ser síncrona se o provider responder em < 10s; caso contrário, enfileira e notifica via WebSocket ou polling.
- Geração em **massa** (`POST /ai/products/generate-batch`): sempre assíncrona via fila RabbitMQ no `apps/worker/`. Retorna `202 Accepted` com um `job_id` para rastreamento.
- O conteúdo gerado **não** substitui automaticamente campos preenchidos manualmente — a UI deve apresentar como sugestão, e o administrador confirma ou descarta. (A exceção é quando o campo está vazio: pode preencher diretamente.)
- Prompts são templates internos versionados no código; não configuraváveis pelo usuário na v1 — evitar prompt injection.
- Controle de uso: o sistema deve logar `input_tokens` e `output_tokens` por geração para monitoramento de custo. Implementar alerta se consumo mensal superar threshold configurado.
- Se o provedor configurado retornar erro (rate limit, autenticação, timeout), o sistema tenta o provedor de fallback na ordem: provedor configurado → próximo habilitado → erro 503.
- Conteúdo gerado para SEO deve sempre incluir o nome do produto; não aceitar saída que omita completamente o nome.
- Schema.org gerado deve ser JSON-LD válido do tipo `Product`.
- Geração em massa: rate limiting interno — máximo 10 requisições simultâneas ao provider para evitar banimento de API Key.

## Invariantes Críticos

- **API Keys do módulo 19, não do env:** o `AiService` busca as chaves no banco via `ApiKeysService`; nunca `process.env.OPENAI_API_KEY` diretamente neste módulo.
- **Prompts internos apenas:** nenhuma entrada do usuário é interpolada diretamente no prompt sem sanitização — usar templates com substituição controlada de variáveis (nome do produto, categoria, etc.).
- **Geração em massa é assíncrona:** nunca bloquear uma requisição HTTP para processar mais de 1 produto.
- **Logging de tokens:** toda geração registra `input_tokens` e `output_tokens` para rastreabilidade de custo.

## Dependências

- **Upstream (usa):**
  - `apps/api/src/modules/api-keys-ia/` (módulo 19) — buscar e descriptografar API Keys
  - `apps/api/src/modules/produtos/` — dados do produto para contexto do prompt e persistência do resultado
  - RabbitMQ — fila de geração em massa
  - SDK do provedor: `openai`, `@google/generative-ai` ou equivalente

- **Downstream (usado por):**
  - `apps/api/src/modules/produtos/` — campo de geração de conteúdo na interface de edição do produto
  - `apps/admin/` — botão "Gerar com IA" na aba SEO/Descrição do produto

## Skills Relevantes

- `nestjs-erp-module` — estrutura do módulo, injeção de dependência, consumer de fila
- `seguranca-lgpd` — uso seguro de API Keys criptografadas, sem exposição de chaves em logs

## Agentes Relevantes

- `revisor-erp` — verificar que API Keys não são logadas nem expostas
- `construtor-de-modulo` — ao implementar o módulo na Fase 2

## Critérios de Aceite

- [ ] `POST /ai/products/:id/generate` com `fields: ["description", "seo_title"]` retorna conteúdo gerado para o produto especificado.
- [ ] Geração em massa (`generate-batch`) retorna `202 Accepted` e enfileira o trabalho no RabbitMQ; não bloqueia o HTTP.
- [ ] API Key do provedor buscada do módulo 19 (banco); não lida de variável de ambiente neste módulo.
- [ ] Campo já preenchido manualmente: conteúdo gerado é retornado como sugestão, não sobrescrito automaticamente.
- [ ] Schema.org gerado é JSON-LD válido do tipo `Product` (validável por ferramenta de teste de dados estruturados).
- [ ] API Key inválida ou expirada: sistema tenta provedor de fallback configurado; se nenhum disponível, retorna `503`.
- [ ] Toda geração registra `input_tokens` e `output_tokens` em log/banco para rastreamento de custo.
- [ ] Nenhuma API Key aparece em logs de aplicação ou respostas de API.
- [ ] `GET /ai/providers` lista apenas provedores com API Key válida configurada no módulo 19.
