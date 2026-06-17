# 14. Configurações da Empresa

**Domínio:** Plataforma & Gestão
**Prioridade:** P0
**Path NestJS:** `apps/api/src/modules/company-settings/`

---

## Responsabilidade

Armazenar e gerenciar os dados cadastrais da empresa (razão social, CNPJ/CPF, contatos, endereço, logo e configurações gerais), servindo como fonte de verdade para todos os módulos que precisam de dados da empresa emissora.

---

## Entidades

### CompanySettings

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| `id` | `uuid` | PK gerado automaticamente |
| `razao_social` | `varchar(255)` | Obrigatório |
| `nome_fantasia` | `varchar(255)` | Opcional |
| `cnpj_cpf` | `varchar(14)` | Armazenado apenas com dígitos; validado por dígito verificador (não só máscara); índice único |
| `tipo_documento` | `enum('CNPJ','CPF')` | Derivado do tamanho, mas explícito para clareza |
| `inscricao_estadual` | `varchar(20)` | Opcional; armazenado só dígitos |
| `inscricao_municipal` | `varchar(20)` | Opcional |
| `regime_tributario` | `enum('SIMPLES','LUCRO_PRESUMIDO','LUCRO_REAL')` | Obrigatório; alimenta engine fiscal |
| `logo_url` | `varchar(500)` | URL no S3/R2; upload separado via módulo Storage |
| `site_url` | `varchar(500)` | Opcional |
| `dpo_email` | `varchar(255)` | E-mail do DPO; obrigatório para conformidade LGPD |
| `created_at` | `timestamptz` | Set automático |
| `updated_at` | `timestamptz` | Set automático |

### CompanyEmail

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| `id` | `uuid` | PK |
| `company_settings_id` | `uuid` | FK → CompanySettings |
| `tipo` | `enum('COMERCIAL','FINANCEIRO','SUPORTE','NFE','DPO','OUTRO')` | Tipado para facilitar buscas funcionais |
| `email` | `varchar(255)` | Validado por formato RFC 5322 |
| `principal` | `boolean` | Apenas um por empresa pode ser `true` |

### CompanyPhone

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| `id` | `uuid` | PK |
| `company_settings_id` | `uuid` | FK → CompanySettings |
| `tipo` | `enum('COMERCIAL','FINANCEIRO','SUPORTE','WHATSAPP','OUTRO')` | Tipado |
| `ddi` | `varchar(5)` | Default `+55` |
| `numero` | `varchar(20)` | Armazenado só dígitos |
| `principal` | `boolean` | Apenas um por empresa pode ser `true` |

### CompanyAddress

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| `id` | `uuid` | PK |
| `company_settings_id` | `uuid` | FK → CompanySettings |
| `tipo` | `enum('MATRIZ','CORRESPONDENCIA','COBRANCA')` | Filiais são Unidades/Lojas (módulo 15) |
| `logradouro` | `varchar(255)` | Obrigatório |
| `numero` | `varchar(20)` | Obrigatório |
| `complemento` | `varchar(100)` | Opcional |
| `bairro` | `varchar(100)` | Obrigatório |
| `municipio` | `varchar(100)` | Obrigatório |
| `uf` | `char(2)` | Obrigatório; código de estado (ex: SP) |
| `cep` | `varchar(8)` | Armazenado só dígitos |
| `codigo_ibge` | `varchar(7)` | Opcional; usado em documentos fiscais |
| `principal` | `boolean` | Endereço de MATRIZ deve existir sempre |

---

## Endpoints

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| `GET` | `/company-settings` | `JwtAuthGuard` + `Role('admin')` | Retorna os dados cadastrais da empresa |
| `PUT` | `/company-settings` | `JwtAuthGuard` + `Role('admin')` | Atualiza dados gerais (upsert — singleton) |
| `GET` | `/company-settings/emails` | `JwtAuthGuard` + `Role('admin')` | Lista e-mails cadastrados |
| `POST` | `/company-settings/emails` | `JwtAuthGuard` + `Role('admin')` | Adiciona e-mail tipado |
| `PUT` | `/company-settings/emails/:id` | `JwtAuthGuard` + `Role('admin')` | Atualiza e-mail |
| `DELETE` | `/company-settings/emails/:id` | `JwtAuthGuard` + `Role('admin')` | Remove e-mail (não permite remover o principal se for único) |
| `GET` | `/company-settings/phones` | `JwtAuthGuard` + `Role('admin')` | Lista telefones cadastrados |
| `POST` | `/company-settings/phones` | `JwtAuthGuard` + `Role('admin')` | Adiciona telefone tipado |
| `PUT` | `/company-settings/phones/:id` | `JwtAuthGuard` + `Role('admin')` | Atualiza telefone |
| `DELETE` | `/company-settings/phones/:id` | `JwtAuthGuard` + `Role('admin')` | Remove telefone |
| `GET` | `/company-settings/addresses` | `JwtAuthGuard` + `Role('admin')` | Lista endereços |
| `POST` | `/company-settings/addresses` | `JwtAuthGuard` + `Role('admin')` | Adiciona endereço tipado |
| `PUT` | `/company-settings/addresses/:id` | `JwtAuthGuard` + `Role('admin')` | Atualiza endereço |
| `DELETE` | `/company-settings/addresses/:id` | `JwtAuthGuard` + `Role('admin')` | Remove endereço (não permite remover o de MATRIZ) |
| `POST` | `/company-settings/logo` | `JwtAuthGuard` + `Role('admin')` | Upload do logo via multipart (delega ao módulo Storage) |

---

## Regras de Negócio

- CNPJ é validado pelos dois dígitos verificadores (algoritmo módulo 11). CPF idem. Rejeitar se inválido com `422 Unprocessable Entity` e mensagem clara.
- CNPJ/CPF são armazenados apenas com dígitos (sem pontuação). A formatação é responsabilidade do frontend ou de um serializer de saída.
- O registro `CompanySettings` é um singleton: existe exatamente uma linha. O `PUT /company-settings` faz upsert. Não há `POST` nem `DELETE` para o recurso raiz.
- Deve existir sempre ao menos um `CompanyEmail` com `tipo = DPO` (exigência LGPD). Rejeitar tentativa de remoção se for o único DPO cadastrado.
- Deve existir sempre ao menos um `CompanyAddress` com `tipo = MATRIZ`.
- O campo `dpo_email` em `CompanySettings` pode ser preenchido com o e-mail DPO principal para uso rápido em outros módulos (canal do DPO no módulo LGPD).
- `regime_tributario` alimenta o módulo de Configuração de Impostos (módulo 18) para derivar alíquotas padrão por regime.
- O upload do logo é delegado ao módulo Storage (módulo 25); este módulo apenas armazena a URL resultante.
- Endereços de filiais são gerenciados no módulo Unidades/Lojas (módulo 15); não duplicar aqui.

---

## Invariantes Críticos

- **CNPJ/CPF nunca em texto não validado no banco.** A validação por dígito é obrigatória antes de qualquer `INSERT` ou `UPDATE`.
- **PII em repouso.** `cnpj_cpf`, `dpo_email` e dados de contato são PII empresarial — considerar criptografia de acordo com a política definida na skill `seguranca-lgpd`.
- **Singleton.** Não pode haver mais de um registro `CompanySettings` ativo. Garantir via constraint de banco (ex: coluna `locked = true` com índice único parcial) ou guard de service.
- **DPO sempre presente.** Ao menos um canal de DPO (`email` ou `dpo_email`) deve estar cadastrado — invariante do módulo LGPD.

---

## Dependências

- **Upstream (usa):**
  - Módulo `Storage` (módulo 25) — upload e gestão da URL do logo
  - Skill `fiscal-br` — validação de CNPJ/CPF por dígito verificador
  - Skill `seguranca-lgpd` — criptografia de PII em repouso

- **Downstream (usado por):**
  - Módulo `Unidades/Lojas` (módulo 15) — herda dados da empresa para endereços de filiais
  - Módulo `Config. de Impostos` (módulo 18) — lê `regime_tributario` para alíquotas padrão
  - Módulo `LGPD` (módulo 22) — lê `dpo_email` como canal do DPO
  - Módulo `Integração Fiscal` (módulo 26) — usa dados da empresa como emitente da NFe/NFCe
  - Módulo `Notificações & Alertas` (módulo 20) — usa e-mails tipados para envio de alertas

---

## Skills Relevantes

- `nestjs-erp-module` — sempre, para estrutura do módulo
- `fiscal-br` — validação de CNPJ/CPF por dígito verificador
- `seguranca-lgpd` — criptografia de PII em repouso, canal do DPO

---

## Agentes Relevantes

- `construtor-de-modulo` — ao criar o módulo inicial
- `revisor-erp` — após qualquer alteração nas entidades ou regras de validação
- `auditor-seguranca-lgpd` — ao lidar com campos de PII e canal do DPO

---

## Critérios de Aceite

- [ ] CNPJ inválido (dígito verificador errado) é rejeitado com `422` e mensagem descritiva.
- [ ] CPF inválido é rejeitado da mesma forma.
- [ ] CNPJ/CPF é persistido sem formatação (apenas dígitos).
- [ ] `GET /company-settings` retorna o CNPJ/CPF formatado na resposta (ex: `XX.XXX.XXX/XXXX-XX`).
- [ ] Tentativa de remover o único endereço MATRIZ retorna erro descritivo.
- [ ] Tentativa de remover o único e-mail DPO retorna erro descritivo.
- [ ] Todos os endpoints retornam `403` para usuários sem role `admin`.
- [ ] Todos os endpoints estão documentados no Swagger com exemplos de request/response.
- [ ] Upload de logo salva URL no campo `logo_url` e não armazena binário no banco.
