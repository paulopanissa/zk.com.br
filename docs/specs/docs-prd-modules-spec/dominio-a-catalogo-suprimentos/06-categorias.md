# 6. Categorias / Subcategorias

**Domínio:** Catálogo & Suprimentos
**Prioridade:** P0
**Path NestJS:** `apps/api/src/modules/categories/`

---

## Responsabilidade

Gerenciar a árvore de classificação de produtos em categorias e subcategorias (hierarquia de dois níveis), permitindo filtrar e organizar o catálogo tanto no ERP quanto no e-commerce.

## Entidades

### Category

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| id | uuid | PK, gerado pelo banco |
| unidade_id | uuid | FK Unidade; escopo de tenancy |
| parent_id | uuid | FK Category; nullable (null = categoria raiz) |
| name | varchar(150) | Obrigatório; único por `(unidade_id, parent_id)` |
| slug | varchar(160) | Gerado do nome; único por `(unidade_id, parent_id)` |
| description | text | Nullable; descrição da categoria |
| image_url | varchar(512) | Nullable; imagem representativa (URL pública no storage) |
| image_storage_key | varchar(512) | Nullable; chave interna no storage |
| sort_order | integer | Ordem de exibição dentro do nível; default 0 |
| active | boolean | Default `true` |
| created_at | timestamptz | Gerado pelo banco |
| updated_at | timestamptz | Atualizado automaticamente |

> Hierarquia de dois níveis: categorias raiz (`parent_id IS NULL`) e subcategorias (`parent_id` aponta para uma raiz). Não suportar profundidade arbitrária no v1 — simplifica queries e frontend.

## Endpoints

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| GET | /categories | Auth+RBAC | Listar categorias raiz com subcategorias aninhadas; filtro: active |
| GET | /categories/flat | Auth+RBAC | Listar todas as categorias em formato flat (para selects) |
| GET | /categories/:id | Auth+RBAC | Buscar categoria por ID com subcategorias |
| POST | /categories | Auth+RBAC | Criar categoria raiz ou subcategoria |
| PATCH | /categories/:id | Auth+RBAC | Atualizar categoria |
| DELETE | /categories/:id | Auth+RBAC | Remover categoria (rejeita se houver produtos vinculados ou subcategorias) |
| PATCH | /categories/reorder | Auth+RBAC | Atualizar `sort_order` em lote (array de `{id, sort_order}`) |
| POST | /categories/:id/image | Auth+RBAC | Upload de imagem da categoria |
| DELETE | /categories/:id/image | Auth+RBAC | Remover imagem da categoria |

## Regras de Negócio

- A hierarquia é limitada a dois níveis: raiz e subcategoria. Uma subcategoria não pode ser pai de outra categoria (rejeitar `parent_id` de uma subcategoria ao criar).
- O slug é gerado automaticamente do `name` (mesmas regras do módulo de Marcas). É único por `(unidade_id, parent_id)` — slugs iguais em categorias de níveis diferentes são permitidos.
- Uma categoria raiz com subcategorias não pode ser excluída diretamente; primeiro é necessário excluir ou reclassificar as subcategorias.
- Uma categoria não pode ser excluída se houver produtos vinculados a ela; retornar erro 409 indicando quantos produtos a usam.
- Desativar uma categoria raiz não desativa automaticamente suas subcategorias — cada uma tem seu `active` independente. Porém, na listagem do e-commerce (futura), categorias cujo pai está inativo são ocultadas.
- `GET /categories` retorna a árvore aninhada com subcategorias dentro do objeto da categoria raiz (formato útil para menus e navegação).
- `GET /categories/flat` retorna lista plana com campo `depth` (0 = raiz, 1 = subcategoria) — formato útil para `<select>` no frontend.
- `sort_order` controla a ordem de exibição dentro do mesmo nível (irmãos). O endpoint `PATCH /categories/reorder` aceita um array e atualiza os valores em lote dentro de uma transação.
- Listagens sempre filtradas por `unidade_id` do contexto autenticado.

## Invariantes Críticos

- Hierarquia máxima de dois níveis — não permitir `parent_id` que aponte para uma subcategoria.
- Não excluir categoria com produtos vinculados ou com subcategorias filhas.
- `unidade_id` sempre do contexto autenticado.

## Dependências

- **Upstream (usa):**
  - `Unidades` — escopo de tenancy
  - `Storage (S3/R2)` — imagens das categorias
- **Downstream (usado por):**
  - `Produtos` — cada produto referencia uma `category_id`
  - `Busca Global` — categorias indexadas no omnisearch
  - `E-commerce` (fase futura) — navegação por categoria

## Skills Relevantes

- `nestjs-erp-module` — estrutura padrão de módulo (sempre)

## Agentes Relevantes

- `construtor-de-modulo` — ao criar o módulo
- `revisor-erp` — após qualquer alteração

## Critérios de Aceite

- [ ] Criação de subcategoria com `parent_id` de outra subcategoria retorna erro 422
- [ ] `GET /categories` retorna árvore aninhada com subcategorias dentro de cada raiz
- [ ] `GET /categories/flat` retorna lista plana com campo `depth`
- [ ] Exclusão de categoria com produtos vinculados retorna erro 409 com contagem de produtos
- [ ] Exclusão de categoria raiz com subcategorias retorna erro 409
- [ ] `PATCH /categories/reorder` atualiza `sort_order` de múltiplas categorias em transação atômica
- [ ] Slug gerado automaticamente; colisão resolvida com sufixo numérico
- [ ] Upload de imagem funciona; exclusão remove do storage e limpa campos no banco
- [ ] Listagem filtra por `unidade_id` do contexto autenticado
- [ ] Endpoints documentados no Swagger
