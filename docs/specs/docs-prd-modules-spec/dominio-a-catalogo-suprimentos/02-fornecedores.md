# 2. Fornecedores

**Domínio:** Catálogo & Suprimentos
**Prioridade:** P0
**Path NestJS:** `apps/api/src/modules/suppliers/`

---

## Responsabilidade

Gerenciar o cadastro de fornecedores com CNPJ/CPF validado por dígito, dados de contato, endereço, logo e marcas representadas — servindo como referência central para vinculação automática durante entrada de Notas Fiscais.

## Entidades

### Supplier

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| id | uuid | PK, gerado pelo banco |
| unidade_id | uuid | FK para Unidade; escopo de tenancy |
| document | varchar(14) | CNPJ (14 dígitos) ou CPF (11 dígitos); armazenado só com dígitos; único por unidade; validado por dígito verificador |
| document_type | enum('CNPJ','CPF') | Derivado do tamanho do documento |
| razao_social | varchar(200) | Obrigatório; nome oficial/razão social |
| nome_fantasia | varchar(200) | Nullable; nome de exibição |
| email | varchar(255) | Nullable; validado por formato |
| phone | varchar(20) | Nullable; armazenado só com dígitos |
| website | varchar(512) | Nullable; URL do site |
| logo_url | varchar(512) | Nullable; URL pública no storage |
| logo_storage_key | varchar(512) | Nullable; chave interna no storage |
| active | boolean | Default `true` |
| notes | text | Nullable; observações internas |
| created_at | timestamptz | Gerado pelo banco |
| updated_at | timestamptz | Atualizado automaticamente |

### SupplierAddress

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| id | uuid | PK |
| supplier_id | uuid | FK para Supplier |
| label | varchar(50) | Ex: "Principal", "Filial SP" |
| cep | varchar(8) | Só dígitos |
| logradouro | varchar(200) | Obrigatório |
| numero | varchar(20) | Obrigatório |
| complemento | varchar(100) | Nullable |
| bairro | varchar(100) | Obrigatório |
| cidade | varchar(100) | Obrigatório |
| estado | char(2) | UF em maiúsculas |
| created_at | timestamptz | Gerado pelo banco |

### SupplierContact

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| id | uuid | PK |
| supplier_id | uuid | FK para Supplier |
| name | varchar(150) | Nome do contato |
| role | varchar(100) | Nullable; ex: "Representante comercial" |
| email | varchar(255) | Nullable |
| phone | varchar(20) | Nullable; só dígitos |
| created_at | timestamptz | Gerado pelo banco |

### SupplierBrand (tabela de junção)

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| supplier_id | uuid | FK para Supplier |
| brand_id | uuid | FK para Brand |
| PRIMARY KEY | (supplier_id, brand_id) | Sem duplicatas |

## Endpoints

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| GET | /suppliers | Auth+RBAC | Listar paginado; filtros: razao_social, document, active, brand_id |
| GET | /suppliers/:id | Auth+RBAC | Buscar fornecedor por ID (inclui addresses, contacts, brands) |
| POST | /suppliers | Auth+RBAC | Criar fornecedor |
| PATCH | /suppliers/:id | Auth+RBAC | Atualizar dados do fornecedor |
| DELETE | /suppliers/:id | Auth+RBAC | Desativar fornecedor (soft-delete) |
| POST | /suppliers/:id/logo | Auth+RBAC | Upload de logo |
| DELETE | /suppliers/:id/logo | Auth+RBAC | Remover logo |
| POST | /suppliers/:id/addresses | Auth+RBAC | Adicionar endereço |
| PATCH | /suppliers/:id/addresses/:addressId | Auth+RBAC | Atualizar endereço |
| DELETE | /suppliers/:id/addresses/:addressId | Auth+RBAC | Remover endereço |
| POST | /suppliers/:id/contacts | Auth+RBAC | Adicionar contato |
| PATCH | /suppliers/:id/contacts/:contactId | Auth+RBAC | Atualizar contato |
| DELETE | /suppliers/:id/contacts/:contactId | Auth+RBAC | Remover contato |
| POST | /suppliers/:id/brands | Auth+RBAC | Vincular marcas (array de brand_ids) |
| DELETE | /suppliers/:id/brands/:brandId | Auth+RBAC | Desvincular marca |
| GET | /suppliers/by-document/:document | Auth+RBAC | Buscar por CNPJ/CPF (usado pelo módulo de NF para vínculo automático) |

## Regras de Negócio

- CNPJ e CPF devem ser validados pelo dígito verificador (não só por máscara). Valores inválidos são rejeitados com erro 422.
- O documento é armazenado apenas com dígitos (sem pontuação), independente do formato de entrada.
- Documento é único por unidade — não podem existir dois fornecedores com o mesmo CNPJ/CPF na mesma unidade.
- A busca `GET /suppliers/by-document/:document` é usada pelo módulo de Notas Fiscais para localizar o fornecedor pelo CNPJ do emissor do XML e vinculá-lo automaticamente ou propor cadastro.
- Fornecedor não pode ser excluído fisicamente se houver notas fiscais vinculadas; nesse caso, retornar erro 409 e orientar a desativar.
- Upload de logo segue as mesmas regras do módulo de Marcas (substituição com remoção do antigo, 2 MB, PNG/JPEG/WEBP).
- Listagens sempre filtradas por `unidade_id` do contexto autenticado.

## Invariantes Críticos

- CNPJ/CPF armazenados **apenas com dígitos** — nunca com pontuação.
- Validação por dígito verificador é obrigatória — máscara não é suficiente.
- `unidade_id` sempre do contexto autenticado, nunca de parâmetro do cliente.
- Dados de contato (email, telefone) não constituem PII criptografada de titular pessoa física no contexto de fornecedor PJ — mas CPF de fornecedor PF deve ser tratado como PII conforme skill `seguranca-lgpd`.

## Dependências

- **Upstream (usa):**
  - `Unidades` — escopo de tenancy
  - `Marcas` — vínculo de marcas representadas
  - `Storage (S3/R2)` — upload de logo
- **Downstream (usado por):**
  - `Notas Fiscais` — vincula fornecedor pelo CNPJ do XML
  - `Busca Global` — fornecedores indexados no omnisearch

## Skills Relevantes

- `nestjs-erp-module` — estrutura padrão de módulo (sempre)
- `fiscal-br` — validação de CNPJ/CPF por dígito verificador, armazenamento só com dígitos
- `seguranca-lgpd` — CPF de fornecedor PF é PII; aplicar criptografia em repouso

## Agentes Relevantes

- `construtor-de-modulo` — ao criar o módulo
- `revisor-erp` — após qualquer alteração
- `auditor-seguranca-lgpd` — ao mexer em campos de CPF (fornecedor PF)

## Critérios de Aceite

- [ ] CNPJ inválido (dígito verificador errado) é rejeitado com erro 422
- [ ] CPF inválido (dígito verificador errado) é rejeitado com erro 422
- [ ] Documento armazenado no banco apenas com dígitos, independente do formato recebido
- [ ] Dois fornecedores com o mesmo CNPJ na mesma unidade retornam erro 409
- [ ] `GET /suppliers/by-document/:document` retorna o fornecedor ou 404
- [ ] Tentativa de exclusão física com notas vinculadas retorna erro 409
- [ ] Upload de logo substitui arquivo anterior no storage
- [ ] Listagem não retorna fornecedores de outras unidades
- [ ] Endpoints documentados no Swagger
