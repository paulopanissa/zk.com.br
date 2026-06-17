# 7. Produtos

**Domínio:** Catálogo & Suprimentos
**Prioridade:** P0
**Path NestJS:** `apps/api/src/modules/products/`

---

## Responsabilidade

Central do catálogo: gerencia todos os atributos de um produto — dados básicos, mídias, configurações de entrega, campos fiscais (NCM, CFOP, CEST, CST/CSOSN, origem) e precificação com simulador de margem — servindo de base para PDV, e-commerce, notas fiscais e geração de SEO/Schema.org.

## Entidades

### Product

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| id | uuid | PK, gerado pelo banco |
| unidade_id | uuid | FK Unidade; escopo de tenancy |
| category_id | uuid | FK Category; nullable |
| brand_id | uuid | FK Brand; nullable |
| name | varchar(300) | Obrigatório |
| slug | varchar(320) | Gerado do nome; único por unidade |
| sku | varchar(100) | Código interno; único por unidade; nullable |
| barcode | varchar(50) | EAN/código de barras; nullable; único por unidade |
| description | text | Descrição completa; suporta markdown |
| short_description | varchar(500) | Descrição curta para listagens e e-commerce |
| unit | varchar(10) | Unidade de medida: UN, KG, CX, etc. |
| active | boolean | Default `true` |
| featured | boolean | Default `false`; destaque no e-commerce |
| min_stock | integer | Nível mínimo para alerta de estoque baixo; default 0 |
| created_at | timestamptz | Gerado pelo banco |
| updated_at | timestamptz | Atualizado automaticamente |

### ProductPricing (aba Produto — precificação)

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| id | uuid | PK |
| product_id | uuid | FK Product; 1:1 |
| cost_price_cents | integer | Preço de custo em centavos; base para o simulador |
| sale_price_cents | integer | Preço de venda em centavos; obrigatório para vender |
| promotional_price_cents | integer | Preço promocional em centavos; nullable |
| promotional_starts_at | timestamptz | Início da promoção; nullable |
| promotional_ends_at | timestamptz | Fim da promoção; nullable |
| discount_enabled | boolean | Default `false`; habilita desconto manual no PDV |
| max_discount_pct | numeric(5,2) | Percentual máximo de desconto manual; nullable (0-100) |
| margin_pct | numeric(8,4) | Margem percentual calculada; armazenada para relatórios; derivada da engine de precificação |
| margin_cents | integer | Margem em R$ (centavos); derivada da engine de precificação |

> Campos `margin_pct` e `margin_cents` são calculados pela Engine de Precificação (módulo 9) e armazenados para performance de relatórios. Recalculados sempre que `cost_price_cents` ou `sale_price_cents` mudar.

### ProductMedia (aba Mídias)

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| id | uuid | PK |
| product_id | uuid | FK Product |
| storage_key | varchar(512) | Chave no storage (S3/R2) |
| url | varchar(512) | URL pública |
| media_type | enum | `IMAGE`, `VIDEO` |
| alt_text | varchar(255) | Texto alternativo para acessibilidade/SEO |
| sort_order | integer | Ordem de exibição; primeira imagem = imagem principal |
| created_at | timestamptz | Gerado pelo banco |

### ProductDelivery (aba Entregas)

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| id | uuid | PK |
| product_id | uuid | FK Product; 1:1 |
| weight_grams | integer | Peso em gramas; nullable |
| height_cm | numeric(8,2) | Altura em cm; nullable |
| width_cm | numeric(8,2) | Largura em cm; nullable |
| depth_cm | numeric(8,2) | Profundidade em cm; nullable |
| free_shipping | boolean | Default `false` |
| ships_from_store | boolean | Default `true` |

### ProductFiscal (aba Fiscal)

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| id | uuid | PK |
| product_id | uuid | FK Product; 1:1 |
| ncm | varchar(8) | Nomenclatura Comum do Mercosul; 8 dígitos |
| cfop | varchar(5) | Código Fiscal de Operações e Prestações |
| cest | varchar(7) | Código Especificador da Substituição Tributária; nullable |
| origem | smallint | 0 a 8 conforme tabela ICMS (0=Nacional, 1=Estrangeira direta, etc.) |
| cst_icms | varchar(3) | CST do ICMS (regime normal); nullable |
| csosn | varchar(3) | CSOSN (Simples Nacional); nullable |
| cst_pis | varchar(2) | CST do PIS; nullable |
| cst_cofins | varchar(2) | CST do COFINS; nullable |
| cst_ipi | varchar(2) | CST do IPI; nullable |
| aliquota_icms | numeric(5,2) | Alíquota ICMS %; nullable |
| aliquota_pis | numeric(5,2) | Alíquota PIS %; nullable |
| aliquota_cofins | numeric(5,2) | Alíquota COFINS %; nullable |
| aliquota_ipi | numeric(5,2) | Alíquota IPI %; nullable |

### ProductSeo (SEO e Schema.org)

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| id | uuid | PK |
| product_id | uuid | FK Product; 1:1 |
| seo_title | varchar(70) | Título para metatag; nullable; se vazio usa `name` do produto |
| seo_description | varchar(160) | Meta description; nullable |
| seo_keywords | text[] | Keywords para meta tags; nullable |
| schema_org_json | jsonb | JSON-LD de Schema.org (Product); gerado pela IA ou manualmente |
| schema_org_generated_at | timestamptz | Última geração via IA; nullable |

## Endpoints

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| GET | /products | Auth+RBAC | Listar produtos paginados; filtros: name, sku, barcode, category_id, brand_id, active, featured |
| GET | /products/:id | Auth+RBAC | Buscar produto por ID (inclui pricing, medias, delivery, fiscal, seo) |
| POST | /products | Auth+RBAC | Criar produto (dados básicos; demais abas via PATCH subrecursos) |
| PATCH | /products/:id | Auth+RBAC | Atualizar dados básicos |
| DELETE | /products/:id | Auth+RBAC | Desativar produto (soft-delete; rejeita exclusão física se houver lotes/movimentações) |
| PATCH | /products/:id/pricing | Auth+RBAC | Atualizar precificação |
| POST | /products/:id/pricing/simulate | Auth+RBAC | Simular margem a partir de custo + parâmetros (não persiste) |
| PATCH | /products/:id/delivery | Auth+RBAC | Atualizar configurações de entrega |
| PATCH | /products/:id/fiscal | Auth+RBAC | Atualizar campos fiscais |
| PATCH | /products/:id/seo | Auth+RBAC | Atualizar campos SEO manualmente |
| POST | /products/:id/seo/generate | Auth+RBAC | Solicitar geração de SEO/Schema.org via IA (enfileira na fila) |
| POST | /products/:id/media | Auth+RBAC | Upload de mídia (imagem/vídeo); multipart |
| DELETE | /products/:id/media/:mediaId | Auth+RBAC | Remover mídia do storage e do banco |
| PATCH | /products/:id/media/reorder | Auth+RBAC | Atualizar `sort_order` das mídias em lote |

## Regras de Negócio

### Dados básicos
- `sku` e `barcode` são únicos por unidade (case-insensitive para sku). Se não informados, ficam nulos.
- Slug gerado automaticamente do `name`; único por unidade; colisão resolvida com sufixo numérico.
- Produto desativado (`active: false`) não aparece no PDV nem no e-commerce, mas continua no estoque.
- Exclusão física é bloqueada se o produto tiver lotes associados ou movimentações de estoque. O correto é desativar.

### Precificação
- `cost_price_cents` e `sale_price_cents` são inteiros (centavos). Nunca float.
- Sempre que `cost_price_cents` ou `sale_price_cents` for atualizado, recalcular e persistir `margin_pct` e `margin_cents` via Engine de Precificação.
- `POST /products/:id/pricing/simulate` chama a Engine com os parâmetros informados (custo, frete, impostos, centro de custo, taxa de cartão) e retorna o preço sugerido e a margem em R$ e % **sem persistir** — é o simulador de margem da aba de produto.
- Preço promocional ativo (`promotional_price_cents` + período vigente) é o preço efetivo no e-commerce/PDV.

### Mídias
- Primeira mídia por `sort_order` é a imagem principal do produto.
- Formatos aceitos para imagem: PNG, JPEG, WEBP. Tamanho máximo: 5 MB.
- `POST /products/:id/media/reorder` atualiza `sort_order` de todas as mídias em lote (transação).

### Campos fiscais
- NCM é obrigatório para emissão de nota (fase futura), mas não bloqueante no cadastro do produto.
- `origem` segue tabela ICMS (0–8).
- CST e CSOSN são mutuamente exclusivos: empresa no Simples Nacional usa CSOSN; regime normal usa CST. A validação pode ser configurada por `regime_tributario` da empresa (módulo de Configurações).

### SEO e Schema.org
- `POST /products/:id/seo/generate` enfileira uma tarefa no RabbitMQ para o worker de IA. O worker gera o JSON-LD de Schema.org (tipo `Product`), `seo_title`, `seo_description` e `seo_keywords` usando a Integração de IA (módulo 27) e atualiza o produto via callback.
- O campo `schema_org_json` pode ser editado manualmente pelo operador via `PATCH /products/:id/seo`.

## Invariantes Críticos

- Todos os valores monetários (custo, venda, margem) em centavos inteiros — nunca float.
- Produto com lotes ou movimentações não pode ser excluído fisicamente.
- Geração de SEO via IA vai para a fila (RabbitMQ) — nunca bloqueia a requisição.
- `unidade_id` sempre do contexto autenticado.
- CST e CSOSN mutuamente exclusivos — validação conforme regime tributário da empresa.

## Dependências

- **Upstream (usa):**
  - `Categorias` — classificação do produto
  - `Marcas` — marca do produto
  - `Unidades` — escopo de tenancy
  - `Storage (S3/R2)` — mídias do produto
  - `Engine de Precificação` (módulo 9) — simulador e cálculo de margem
  - `Integração de IA` (módulo 27) — geração de SEO/Schema.org
- **Downstream (usado por):**
  - `Notas Fiscais` — vinculação de itens da nota ao produto
  - `Lotes` — lotes pertencem a produtos
  - `Estoque` — movimentações referenciam `product_id`
  - `PDV` — catálogo de venda
  - `E-commerce` (fase futura) — catálogo público
  - `Busca Global` — produtos indexados no omnisearch
  - `Relatórios` — análises por produto

## Skills Relevantes

- `nestjs-erp-module` — estrutura padrão de módulo (sempre)
- `fiscal-br` — campos NCM, CFOP, CEST, CST/CSOSN, origem; validações fiscais
- `estoque-lote-fifo` — regra de bloqueio de exclusão física com lotes/movimentações

## Agentes Relevantes

- `construtor-de-modulo` — ao criar o módulo
- `revisor-erp` — após qualquer alteração
- `escritor-de-testes` — para testes de precificação, validações fiscais e simulador de margem

## Critérios de Aceite

- [ ] CRUD completo com paginação e filtros por name, sku, barcode, category_id, brand_id, active
- [ ] Slug gerado automaticamente do nome; único por unidade; sem colisão
- [ ] SKU e barcode únicos por unidade; duplicata retorna erro 409
- [ ] `POST /products/:id/pricing/simulate` retorna preço sugerido e margem em R$ e % sem persistir
- [ ] Atualizar `cost_price_cents` ou `sale_price_cents` recalcula e persiste `margin_pct` e `margin_cents`
- [ ] Todos os valores monetários persistidos como inteiros (centavos)
- [ ] Tentativa de exclusão física de produto com lotes retorna erro 409
- [ ] Upload de imagem aceita PNG, JPEG, WEBP até 5 MB; outros formatos/tamanhos retornam erro 422
- [ ] `PATCH /products/:id/media/reorder` atualiza sort_order em transação atômica
- [ ] `POST /products/:id/seo/generate` enfileira tarefa na fila e retorna 202 Accepted (não bloqueia)
- [ ] Campos fiscais NCM, CFOP, CEST, origem, CST/CSOSN aceitos e persistidos
- [ ] CST e CSOSN não coexistem no mesmo produto (validação conforme regime tributário)
- [ ] Listagem filtra por `unidade_id` do contexto autenticado
- [ ] Todos os endpoints documentados no Swagger com exemplos de todas as abas
