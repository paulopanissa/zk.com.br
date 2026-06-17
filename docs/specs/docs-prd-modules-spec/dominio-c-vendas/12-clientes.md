# 12. Clientes

**Domínio:** Vendas
**Prioridade:** P0
**Path NestJS:** `apps/api/src/modules/customers/`

---

## Responsabilidade

Gerenciar o cadastro de clientes do sistema (PDV/ERP), com formulário dinâmico configurável por ramo de atividade — campos, tipos, validações e opções são definidos pelo administrador — e PII criptografada em repouso conforme LGPD.

> Este módulo gerencia clientes do **realm do sistema** (PDV/ERP). Usuários do e-commerce são um realm separado (módulo 13) e nunca compartilham tabela, schema ou token com este módulo.

---

## Entidades

### CustomerFieldDefinition (Definição de Campo do Formulário)

Define a estrutura dinâmica do formulário de cadastro de clientes. Configurada pelo administrador, válida para toda a unidade.

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| id | uuid | PK |
| unidade_id | uuid | FK → Unidade; escopo obrigatório |
| nome_campo | varchar(60) | Slug interno; único por unidade; ex: `"especie_pet"` |
| label | varchar(120) | Texto exibido no formulário; ex: "Espécie do Pet" |
| tipo | enum | `TEXT`, `NUMBER`, `DATE`, `SELECT`, `MULTISELECT`, `BOOLEAN`, `PHONE`, `EMAIL`, `CPF_CNPJ` |
| obrigatorio | boolean | Default false |
| validacao_regex | varchar(500) | Regex aplicado a campos `TEXT`; nulo para outros tipos |
| opcoes | jsonb | Lista de opções para `SELECT`/`MULTISELECT`; nulo para outros tipos; ex: `[{"value":"gato","label":"Gato"}]` |
| ordem | integer | Posição no formulário; único por unidade |
| ativo | boolean | Default true |
| created_at | timestamptz | Gerenciado pelo ORM |
| updated_at | timestamptz | Gerenciado pelo ORM |

> **Campos nativos obrigatórios:** `nome` e `telefone_principal` são campos fixos internos, sempre presentes, não configuráveis. O form-builder complementa esses campos com os dinâmicos.

### Customer (Cliente)

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| id | uuid | PK |
| unidade_id | uuid | FK → Unidade; escopo obrigatório |
| nome | varchar(255) | Obrigatório |
| telefone_principal | varchar(20) | Armazenado apenas com dígitos; obrigatório |
| email | varchar(255) | Opcional; armazenado em lowercase; validado por formato |
| cpf_cnpj | varchar(14) | **PII — criptografada em repouso**; somente dígitos; validado por dígito verificador; opcional |
| data_nascimento | date | **PII — criptografada em repouso**; opcional |
| dados_dinamicos | jsonb | Valores dos campos definidos em `CustomerFieldDefinition`; ex: `{"especie_pet":"gato","nome_pet":"Rex"}` |
| consentimento_lgpd | boolean | Indica se o titular deu consentimento explícito ao cadastro |
| consentimento_versao | varchar(20) | Versão do texto de consentimento aceito; ex: "v1.0" |
| consentimento_em | timestamptz | Momento do aceite do consentimento |
| ativo | boolean | Default true |
| created_at | timestamptz | Gerenciado pelo ORM |
| updated_at | timestamptz | Gerenciado pelo ORM |
| deleted_at | timestamptz | Soft delete; nulo quando ativo |

### CustomerAuditLog (Log de Auditoria — LGPD)

Registra acessos e alterações em dados pessoais.

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| id | uuid | PK |
| customer_id | uuid | FK → Customer |
| acao | enum | `CRIACAO`, `LEITURA`, `ATUALIZACAO`, `EXCLUSAO`, `EXPORTACAO` |
| usuario_id | uuid | FK → Usuário do sistema que realizou a ação |
| ip_origem | varchar(45) | IPv4 ou IPv6 |
| detalhe | text | Campos alterados (para UPDATE) ou motivo (para EXCLUSAO/EXPORTACAO) |
| created_at | timestamptz | Gerenciado pelo ORM |

---

## Endpoints

### Configuração do formulário (admin)

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| GET | `/customers/field-definitions` | JWT + RBAC (admin) | Lista definições de campo da unidade |
| POST | `/customers/field-definitions` | JWT + RBAC (admin) | Cria campo do formulário |
| PATCH | `/customers/field-definitions/:id` | JWT + RBAC (admin) | Atualiza campo (label, validação, ordem, opções) |
| DELETE | `/customers/field-definitions/:id` | JWT + RBAC (admin) | Desativa campo (soft delete; dados existentes são preservados) |
| PATCH | `/customers/field-definitions/reorder` | JWT + RBAC (admin) | Reordena campos (recebe array de `{id, ordem}`) |

### CRUD de clientes

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| GET | `/customers` | JWT + RBAC (admin, pdv) | Lista clientes (paginado; busca por nome/telefone/email) |
| POST | `/customers` | JWT + RBAC (admin, pdv) | Cadastra cliente |
| GET | `/customers/:id` | JWT + RBAC (admin, pdv) | Detalha cliente (registra log de LEITURA) |
| PATCH | `/customers/:id` | JWT + RBAC (admin, pdv) | Atualiza cliente (registra log de ATUALIZACAO) |
| DELETE | `/customers/:id` | JWT + RBAC (admin) | Anonimiza/exclui cliente por direito LGPD (registra log de EXCLUSAO) |

### Direitos do titular (LGPD)

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| GET | `/customers/:id/export` | JWT + RBAC (admin) | Exporta todos os dados do titular em JSON (registra log de EXPORTACAO) |

---

## Regras de Negócio

### Form-builder dinâmico

- `CustomerFieldDefinition` define o contrato do formulário. O frontend consulta as definições antes de renderizar o formulário de cadastro.
- No momento do `POST /customers`, o campo `dados_dinamicos` é validado contra as `CustomerFieldDefinition` ativas: campos obrigatórios devem estar presentes; tipos são verificados; `TEXT` com `validacao_regex` é testado.
- Desativar um campo do formulário **não** apaga os dados históricos em `dados_dinamicos` dos clientes existentes.
- Campos do tipo `CPF_CNPJ` nos dados dinâmicos seguem a mesma regra de validação e criptografia do campo `cpf_cnpj` nativo.
- `nome_campo` usa apenas lowercase, underscore e algarismos (validado via regex `^[a-z0-9_]+$`); único por unidade.

### PII e criptografia

- `cpf_cnpj` e `data_nascimento` são criptografados em repouso usando chave gerenciada por variável de ambiente (AES-256 ou equivalente).
- A descriptografia ocorre apenas na camada de serviço; o repository nunca retorna PII em claro para o controller sem passar pelo service.
- A busca por CPF/CNPJ exige a descriptografia — usar índice de hash (`hmac` ou hash determinístico) para busca sem expor o valor.
- `email` é armazenado em lowercase mas sem criptografia; é um identificador semi-público no contexto do PDV.

### LGPD

- `consentimento_lgpd`, `consentimento_versao` e `consentimento_em` devem ser preenchidos no momento do cadastro; o sistema rejeita cadastro sem consentimento.
- A exclusão de cliente é **anonimização**: campos PII são zerados/substituídos por placeholders (`[ANONIMIZADO]`), o registro é mantido para integridade referencial com vendas históricas.
- O endpoint `/export` retorna todos os dados do titular em texto claro (após descriptografia), destinado ao exercício do direito de portabilidade (Art. 18, IV, LGPD).
- Todo acesso (leitura, atualização, exclusão, exportação) registra `CustomerAuditLog`.

### Busca

- A busca por nome usa `pg_trgm` (busca fuzzy) para tolerância a erros de digitação.
- A busca por telefone é por prefixo (busca com `LIKE 'X%'` após normalizar para somente dígitos).
- CPF/CNPJ usa o índice de hash determinístico (não expõe PII no índice).

---

## Invariantes Críticos

- **PII criptografada em repouso:** `cpf_cnpj` e `data_nascimento` nunca são persistidos em claro.
- **Consentimento obrigatório no cadastro:** nenhum cliente sem `consentimento_lgpd = true` pode ser criado.
- **Anonimização em vez de exclusão física:** clientes com vendas vinculadas nunca são deletados fisicamente; são anonimizados.
- **Realms separados:** este módulo gerencia exclusivamente clientes do sistema (PDV/ERP); nunca compartilha tabela com usuários do e-commerce.
- **Escopo por unidade obrigatório:** nenhuma query retorna clientes de outra unidade.
- **Audit log em toda operação PII:** leitura, escrita, exportação e exclusão de dados pessoais são sempre registradas.

---

## Dependências

- **Upstream (usa):**
  - `Unidades / Lojas` (módulo 15) — escopo de `unidade_id`
  - `Autenticação & Autorização` (módulo 23) — JWT e RBAC
  - `LGPD` (módulo 22) — protocolo de consentimento e direitos do titular

- **Downstream (usado por):**
  - `PDV` (módulo 11) — vincula cliente à venda
  - `Relatórios` (módulo 21) — análise de clientes
  - `Busca Global` (módulo 24) — indexa nome e telefone (sem PII)

---

## Skills Relevantes

- `nestjs-erp-module` — estrutura padrão (sempre)
- `seguranca-lgpd` — criptografia de PII, consentimento, audit log, anonimização
- `fiscal-br` — validação de CPF/CNPJ por dígito verificador

---

## Agentes Relevantes

- `construtor-de-modulo` — ao criar o módulo
- `revisor-erp` — após alterações, antes de commit/PR
- `auditor-seguranca-lgpd` — obrigatório antes de qualquer release que exponha dados de cliente
- `escritor-de-testes` — cobertura de validação de CPF/CNPJ, criptografia, form-builder dinâmico

---

## Critérios de Aceite

- [ ] CPF/CNPJ inválido (dígito verificador incorreto) é rejeitado com HTTP 422 no cadastro.
- [ ] `cpf_cnpj` armazenado no banco está criptografado (não legível como texto claro em consulta direta ao banco).
- [ ] Cadastro sem `consentimento_lgpd = true` retorna HTTP 422.
- [ ] Busca por nome com erro de digitação ("joao" encontra "João") funciona via `pg_trgm`.
- [ ] Campo obrigatório ausente em `dados_dinamicos` retorna HTTP 422 com indicação do campo faltante.
- [ ] Campo com `validacao_regex` inválido retorna HTTP 422 com indicação do campo e da falha.
- [ ] `GET /customers/:id` registra entrada no `CustomerAuditLog` com acao = `LEITURA`.
- [ ] `DELETE /customers/:id` anonimiza PII e registra log de `EXCLUSAO`; o registro permanece no banco.
- [ ] `GET /customers/:id/export` retorna dados em claro (CPF descriptografado) e registra log de `EXPORTACAO`.
- [ ] Nenhum endpoint retorna clientes de `unidade_id` diferente do contexto autenticado.
- [ ] Dados dinâmicos de clientes existentes não são perdidos ao desativar um campo do form-builder.
- [ ] Todos os endpoints documentados no Swagger.
