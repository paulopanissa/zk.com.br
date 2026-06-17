# 21. Relatórios

**Domínio:** Plataforma & Gestão
**Prioridade:** P1
**Path NestJS:** `apps/api/src/modules/reports/`

---

## Responsabilidade

Prover relatórios analíticos de vendas, estoque, compras, clientes e produtos com geração assíncrona (via fila) para relatórios pesados, expondo tanto endpoints de consulta em tempo real (dados sumarizados) quanto exportação em CSV/XLSX para análise offline.

---

## Entidades

### ReportJob

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| `id` | `uuid` | PK |
| `unidade_id` | `uuid` | FK → Unit; escopo |
| `tipo` | `enum('VENDAS','ESTOQUE','CLIENTES','COMPRAS','PRODUTOS_MARGEM','PRODUTOS_LUCRO','PRODUTOS_MAIS_VENDIDOS','PRODUTOS_MAIOR_DESCONTO','PRODUTOS_FAIXA_PRECO')` | Tipo do relatório |
| `parametros` | `jsonb` | Filtros aplicados (período, categorias, produtos, etc.) |
| `status` | `enum('AGUARDANDO','PROCESSANDO','CONCLUIDO','FALHOU')` | Status do job |
| `formato` | `enum('JSON','CSV','XLSX')` | Formato solicitado |
| `arquivo_url` | `varchar(500)` | URL no S3/R2 do arquivo gerado; `null` até concluir |
| `arquivo_expira_at` | `timestamptz` | Expiração do arquivo no storage (ex: 24h) |
| `solicitado_por` | `uuid` | FK → User |
| `created_at` | `timestamptz` | |
| `started_at` | `timestamptz` | Quando o worker iniciou |
| `completed_at` | `timestamptz` | Quando o worker concluiu ou falhou |
| `erro_mensagem` | `text` | Mensagem de erro se `status = FALHOU` |

---

## Endpoints

### Relatórios sob demanda (assíncrono)

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| `POST` | `/reports/jobs` | `JwtAuthGuard` + `Role('admin')` | Solicita geração de relatório (enfileira job) |
| `GET` | `/reports/jobs` | `JwtAuthGuard` + `Role('admin')` | Lista jobs do usuário autenticado (paginado) |
| `GET` | `/reports/jobs/:id` | `JwtAuthGuard` + `Role('admin')` | Status e URL de download do job |
| `GET` | `/reports/jobs/:id/download` | `JwtAuthGuard` + `Role('admin')` | Redireciona para URL assinada do arquivo no S3/R2 |

### Relatórios sumários em tempo real (consultas leves)

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| `GET` | `/reports/sales/summary` | `JwtAuthGuard` + `Role('admin')` | Vendas totais e ticket médio por período |
| `GET` | `/reports/sales/by-period` | `JwtAuthGuard` + `Role('admin')` | Vendas agrupadas por dia/semana/mês |
| `GET` | `/reports/sales/by-payment-method` | `JwtAuthGuard` + `Role('admin')` | Vendas por método de pagamento |
| `GET` | `/reports/stock/summary` | `JwtAuthGuard` + `Role('admin')` | Resumo de estoque: total, crítico, zerado, próximo do vencimento |
| `GET` | `/reports/stock/movements` | `JwtAuthGuard` + `Role('admin')` | Movimentações de estoque por período (paginado) |
| `GET` | `/reports/products/top-selling` | `JwtAuthGuard` + `Role('admin')` | Top N produtos mais vendidos (por quantidade ou faturamento) |
| `GET` | `/reports/products/by-margin` | `JwtAuthGuard` + `Role('admin')` | Produtos ordenados por margem (melhores/piores) |
| `GET` | `/reports/products/by-discount` | `JwtAuthGuard` + `Role('admin')` | Produtos com maiores descontos praticados |
| `GET` | `/reports/products/price-range` | `JwtAuthGuard` + `Role('admin')` | Distribuição de produtos por faixa de preço |
| `GET` | `/reports/customers/summary` | `JwtAuthGuard` + `Role('admin')` | Total de clientes, novos no período, recorrentes |
| `GET` | `/reports/customers/top-buyers` | `JwtAuthGuard` + `Role('admin')` | Clientes por valor total comprado |
| `GET` | `/reports/purchases/summary` | `JwtAuthGuard` + `Role('admin')` | Compras (notas fiscais de entrada) por período e fornecedor |

---

## Parâmetros de Query Comuns

Todos os endpoints sumários aceitam:

| Parâmetro | Tipo | Notas |
|-----------|------|-------|
| `date_from` | `ISO8601` | Início do período |
| `date_to` | `ISO8601` | Fim do período |
| `unidade_id` | `uuid` | Filtro de unidade (admin com acesso multi-unidade) |
| `limit` | `integer` | Para listagens top-N; default 10, max 100 |
| `format` | `enum('json')` | Sumários retornam sempre JSON |

---

## Regras de Negócio

- **Relatórios pesados (CSV/XLSX ou períodos longos) são gerados de forma assíncrona.** `POST /reports/jobs` publica na fila RabbitMQ e retorna `202 Accepted` com o `job_id`. O worker do `apps/worker` processa e armazena o arquivo no S3/R2.
- **Relatórios sumários** (endpoints `GET /reports/*/summary`) executam queries otimizadas diretamente e respondem de forma síncrona. Devem ter Redis cache com TTL curto (ex: 5 minutos) para não sobrecarregar o banco.
- `GET /reports/jobs/:id/download` verifica que o job pertence ao usuário autenticado (`solicitado_por = me`) antes de gerar URL assinada. URL assinada tem validade de 15 minutos.
- Arquivos gerados no S3/R2 expiram em 24 horas (`arquivo_expira_at`). Após a expiração, o job é mantido no banco mas o arquivo não está mais disponível — usuário deve solicitar novo job.
- Toda query de relatório filtra obrigatoriamente por `unidade_id` do contexto autenticado ou do parâmetro (quando o usuário tem permissão multi-unidade).
- Margem e lucro são calculados com base nos dados históricos das movimentações de estoque (custo real da compra do lote), não do preço de custo atual do produto. Isso garante acurácia histórica.
- Relatório `PRODUTOS_MARGEM` lista melhores e piores: os N produtos com maior margem % e os N com menor margem (potencialmente negativos).
- `PRODUTOS_FAIXA_PRECO` distribui produtos em faixas configuráveis (ex: 0–50, 51–100, 101–500, 500+) em R$.

---

## Invariantes Críticos

- **Relatórios pesados NUNCA na requisição HTTP.** A geração de arquivos CSV/XLSX com grandes volumes de dados DEVE ir para o worker. Quebrar isto pode travar a API por minutos.
- **Escopo de tenancy obrigatório.** Nenhuma query de relatório pode retornar dados fora do `unidade_id` do contexto autenticado.
- **Valores monetários em centavos.** Toda soma de faturamento, custo ou lucro é calculada em centavos (inteiro) e convertida para reais apenas na serialização da resposta.
- **URL assinada, não URL pública.** O arquivo no S3/R2 nunca é público. O download é sempre via URL assinada com expiração curta.

---

## Dependências

- **Upstream (usa):**
  - RabbitMQ — fila de jobs de relatório
  - Módulo `Storage` (módulo 25) — armazenamento e URL assinada dos arquivos
  - Redis — cache de sumários em tempo real
  - Módulo `Unidades/Lojas` (módulo 15) — escopo por `unidade_id`

- **Downstream (usado por):**
  - Frontend `admin` — dashboard principal e tela de relatórios
  - Módulo `Notificações & Alertas` (módulo 20) — pode disparar alertas baseados em métricas de relatório (ex: meta de vendas)

---

## Skills Relevantes

- `nestjs-erp-module` — sempre
- `estoque-lote-fifo` — para cálculo de custo real por lote nos relatórios de margem/lucro

---

## Agentes Relevantes

- `construtor-de-modulo` — ao criar o módulo
- `revisor-erp` — após alterações; verificar que processamento pesado está na fila e escopo de tenancy está correto

---

## Critérios de Aceite

- [ ] `POST /reports/jobs` retorna `202 Accepted` com `job_id` imediatamente (não aguarda geração).
- [ ] Worker gera arquivo CSV/XLSX e salva no S3/R2; status do job atualiza para `CONCLUIDO`.
- [ ] `GET /reports/jobs/:id/download` retorna URL assinada com 15 min de validade; após expiração retorna `410 Gone`.
- [ ] Usuário A não consegue fazer download do job do usuário B (`403`).
- [ ] `GET /reports/sales/summary` tem cache Redis; segunda chamada idêntica em menos de 5 min é servida do cache.
- [ ] Relatórios de margem usam custo histórico do lote, não o custo atual do produto.
- [ ] Todos os endpoints respeitam `unidade_id` do contexto autenticado.
- [ ] Todos os endpoints documentados no Swagger com exemplos de parâmetros e resposta.
