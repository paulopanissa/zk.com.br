# 1. Marcas

**Domínio:** Catálogo & Suprimentos
**Prioridade:** P0
**Path NestJS:** `apps/api/src/modules/brands/`

---

## Responsabilidade

Gerenciar o catálogo de marcas da plataforma, permitindo associar produtos e fornecedores a uma marca com nome, slug e logo — servindo como referência central para filtragem, busca e aplicação em lote via Nota Fiscal.

## Entidades

### Brand

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| id | uuid | PK, gerado pelo banco |
| unidade_id | uuid | FK para Unidade; escopo de tenancy |
| name | varchar(150) | Obrigatório; único por unidade |
| slug | varchar(160) | Gerado automaticamente a partir do nome; único por unidade; apenas letras, números e hífens |
| logo_url | varchar(512) | Nullable; URL pública do storage (S3/R2) |
| logo_storage_key | varchar(512) | Nullable; chave interna no storage para exclusão |
| active | boolean | Default `true`; inativo não aparece em selects |
| created_at | timestamptz | Gerado pelo banco |
| updated_at | timestamptz | Atualizado automaticamente |

## Endpoints

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| GET | /brands | Auth+RBAC | Listar marcas paginadas, filtro por name/active |
| GET | /brands/:id | Auth+RBAC | Buscar marca por ID |
| POST | /brands | Auth+RBAC | Criar marca |
| PATCH | /brands/:id | Auth+RBAC | Atualizar marca |
| DELETE | /brands/:id | Auth+RBAC | Remover marca (soft-delete se tiver vínculos) |
| POST | /brands/:id/logo | Auth+RBAC | Upload de logo (multipart); armazena no S3/R2 |
| DELETE | /brands/:id/logo | Auth+RBAC | Remover logo do storage e limpar campos |

## Regras de Negócio

- O slug é gerado automaticamente a partir do `name` (lowercase, normalização unicode, hífens no lugar de espaços/caracteres especiais). Se o slug gerado colidir, adicionar sufixo numérico incremental.
- Slug não pode ser alterado manualmente pelo cliente — é sempre derivado do nome, garantindo consistência de URL.
- Uma marca não pode ser excluída fisicamente enquanto houver produtos ou fornecedores vinculados a ela; nesse caso, deve ser desativada (`active: false`).
- O upload de logo substitui o arquivo anterior: antes de salvar o novo, excluir o antigo do storage.
- O tamanho máximo de logo aceito é 2 MB; formatos aceitos: PNG, JPEG, WEBP, SVG.
- Listagens sempre filtradas por `unidade_id` do contexto autenticado — nunca expostas de forma cross-unidade.
- Nome de marca é único por unidade (case-insensitive).

## Invariantes Críticos

- `unidade_id` sempre vem do contexto autenticado, nunca de parâmetro do cliente.
- Nunca excluir fisicamente uma marca com vínculos ativos (produtos ou fornecedores).
- Ao remover logo, garantir exclusão do arquivo no storage antes de limpar os campos no banco para evitar arquivos órfãos.

## Dependências

- **Upstream (usa):**
  - `Unidades` — escopo de tenancy
  - `Storage (S3/R2)` — upload e remoção de logos
- **Downstream (usado por):**
  - `Fornecedores` — vincula marcas representadas
  - `Notas Fiscais` — aplica marca em lote ou por item
  - `Produtos` — cada produto referencia uma marca
  - `Busca Global` — marcas indexadas no omnisearch

## Skills Relevantes

- `nestjs-erp-module` — estrutura padrão de módulo (sempre)

## Agentes Relevantes

- `construtor-de-modulo` — ao criar o módulo
- `revisor-erp` — após qualquer alteração

## Critérios de Aceite

- [ ] CRUD completo funcionando com paginação e filtros por `name` e `active`
- [ ] Slug gerado automaticamente a partir do nome; sem colisão por sufixo numérico
- [ ] Upload de logo aceita PNG, JPEG, WEBP, SVG até 2 MB; rejeita outros formatos/tamanhos com erro 422
- [ ] Upload substitui logo anterior e remove o arquivo antigo do storage
- [ ] Tentativa de exclusão de marca com produtos vinculados retorna erro 409 e orienta a desativar
- [ ] Todos os endpoints filtram por `unidade_id` do contexto autenticado
- [ ] Listagem não retorna marcas de outras unidades
- [ ] Endpoints documentados no Swagger com exemplos de request/response
