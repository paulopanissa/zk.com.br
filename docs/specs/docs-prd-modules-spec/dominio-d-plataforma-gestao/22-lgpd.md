# 22. LGPD

**Domínio:** Plataforma & Gestão
**Prioridade:** P0
**Path NestJS:** `apps/api/src/modules/lgpd/`

---

## Responsabilidade

Garantir a conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018): registrar e versionar consentimentos, manter log de auditoria de acessos e alterações em dados pessoais, atender solicitações dos titulares (exportação e exclusão de dados) e disponibilizar o canal do DPO.

---

## Entidades

### ConsentRecord

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| `id` | `uuid` | PK |
| `titular_tipo` | `enum('CLIENTE_ECOMMERCE','USUARIO_SISTEMA','FORNECEDOR_PF')` | Tipo do titular de dados |
| `titular_id` | `uuid` | ID do titular na sua respectiva tabela |
| `finalidade` | `varchar(255)` | Ex: "Envio de e-mail marketing", "Processamento de pedido", "Análise de perfil" |
| `base_legal` | `enum('CONSENTIMENTO','CONTRATO','OBRIGACAO_LEGAL','INTERESSE_LEGITIMO','PROTECAO_CREDITO','TUTELA_SAUDE')` | Base legal LGPD (Art. 7) |
| `versao_politica` | `varchar(20)` | Versão da Política de Privacidade aceita (ex: `v2.3`) |
| `texto_politica_hash` | `varchar(64)` | SHA-256 do texto da política na época do consentimento |
| `ip_origem` | `varchar(45)` | IP do dispositivo no momento do consentimento |
| `user_agent` | `text` | User-agent no momento do consentimento |
| `consentido_at` | `timestamptz` | Quando o consentimento foi dado |
| `revogado_at` | `timestamptz` | Quando foi revogado; `null` se ativo |
| `canal` | `enum('WEB','PDV','API','IMPORTACAO','MANUAL')` | Canal pelo qual o consentimento foi coletado |

### PrivacyPolicyVersion

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| `id` | `uuid` | PK |
| `versao` | `varchar(20)` | Ex: `v1.0`, `v2.3`; único |
| `texto` | `text` | Texto completo da política |
| `texto_hash` | `varchar(64)` | SHA-256 do texto; para verificação de integridade |
| `vigente_a_partir_de` | `date` | Data de vigência |
| `ativa` | `boolean` | Apenas uma ativa por vez |
| `publicado_por` | `uuid` | FK → User |
| `created_at` | `timestamptz` | |

### PersonalDataAuditLog

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| `id` | `uuid` | PK |
| `acao` | `enum('ACESSO','CRIACAO','ATUALIZACAO','EXCLUSAO','EXPORTACAO','PORTABILIDADE')` | Tipo de operação |
| `entidade_tipo` | `varchar(100)` | Ex: `customers`, `ecommerce_users` |
| `entidade_id` | `uuid` | ID do registro afetado |
| `campos_afetados` | `text[]` | Array de nomes de campos alterados (sem os valores) |
| `executado_por_id` | `uuid` | FK → User (sistema ou humano) |
| `executado_por_tipo` | `enum('USUARIO_SISTEMA','WORKER','SISTEMA')` | Quem executou |
| `ip_origem` | `varchar(45)` | IP da requisição |
| `justificativa` | `text` | Opcional; para ações manuais sensíveis |
| `created_at` | `timestamptz` | Imutável; índice para consultas por período |

### DataSubjectRequest (Solicitação do Titular)

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| `id` | `uuid` | PK |
| `protocolo` | `varchar(20)` | Número de protocolo legível (ex: `DSR-2025-0042`); único |
| `titular_tipo` | `enum('CLIENTE_ECOMMERCE','USUARIO_SISTEMA','FORNECEDOR_PF')` | |
| `titular_id` | `uuid` | Pode ser `null` se o titular não tem conta (solicitação anônima) |
| `titular_email` | `varchar(255)` | **Criptografado em repouso**; canal de resposta |
| `tipo` | `enum('EXPORTACAO','EXCLUSAO','CORRECAO','REVOGACAO_CONSENTIMENTO','INFORMACAO')` | Tipo de direito solicitado |
| `descricao` | `text` | Descrição da solicitação |
| `status` | `enum('RECEBIDA','EM_ANALISE','AGUARDANDO_TITULAR','CONCLUIDA','NEGADA')` | |
| `prazo_legal_at` | `timestamptz` | Prazo legal de 15 dias úteis (Art. 18 LGPD) |
| `arquivo_exportacao_url` | `varchar(500)` | URL assinada no S3/R2 do ZIP de exportação; `null` até concluir |
| `arquivo_expira_at` | `timestamptz` | Expiração do arquivo (72h) |
| `atendida_por_id` | `uuid` | FK → User (DPO ou admin); quem concluiu |
| `resposta_dpo` | `text` | Texto de resposta ao titular |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### DpoContact

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| `id` | `uuid` | PK; singleton |
| `nome` | `varchar(255)` | Nome do DPO |
| `email` | `varchar(255)` | **Criptografado em repouso** |
| `telefone` | `varchar(20)` | **Criptografado em repouso**; apenas dígitos |
| `organizacao` | `varchar(255)` | Nome da empresa ou consultoria do DPO |
| `updated_at` | `timestamptz` | |

---

## Endpoints

### Consentimentos

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| `GET` | `/lgpd/consents` | `JwtAuthGuard` + `Role('admin','dpo')` | Lista consentimentos (filtro por titular, finalidade, status) |
| `GET` | `/lgpd/consents/:id` | `JwtAuthGuard` + `Role('admin','dpo')` | Detalhe de consentimento |
| `POST` | `/lgpd/consents` | `JwtAuthGuard` (sistema interno) | Registra consentimento no momento da coleta |
| `POST` | `/lgpd/consents/:id/revoke` | `JwtAuthGuard` | Revoga consentimento (titular ou admin/DPO) |

### Política de Privacidade

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| `GET` | `/lgpd/privacy-policy` | Público | Retorna a versão ativa da política |
| `GET` | `/lgpd/privacy-policy/versions` | `JwtAuthGuard` + `Role('admin','dpo')` | Lista todas as versões |
| `POST` | `/lgpd/privacy-policy` | `JwtAuthGuard` + `Role('admin')` | Publica nova versão (inativa as anteriores) |

### Log de Auditoria

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| `GET` | `/lgpd/audit-logs` | `JwtAuthGuard` + `Role('admin','dpo')` | Lista logs de auditoria (paginado; filtros: entidade, ação, período) |
| `GET` | `/lgpd/audit-logs/:entidade_tipo/:entidade_id` | `JwtAuthGuard` + `Role('admin','dpo')` | Histórico de um dado específico |

### Solicitações do Titular

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| `POST` | `/lgpd/requests` | Público + Rate Limit | Titular submete solicitação (email verificado) |
| `GET` | `/lgpd/requests` | `JwtAuthGuard` + `Role('admin','dpo')` | Lista solicitações (filtro: tipo, status) |
| `GET` | `/lgpd/requests/:id` | `JwtAuthGuard` + `Role('admin','dpo')` | Detalhe da solicitação |
| `PUT` | `/lgpd/requests/:id/status` | `JwtAuthGuard` + `Role('dpo','admin')` | Atualiza status e resposta do DPO |
| `POST` | `/lgpd/requests/:id/export` | `JwtAuthGuard` + `Role('dpo','admin')` | Inicia job de exportação de dados do titular |
| `GET` | `/lgpd/requests/:id/download` | `JwtAuthGuard` + `Role('dpo','admin')` | URL assinada do ZIP de exportação |

### DPO

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| `GET` | `/lgpd/dpo` | Público | Retorna informações de contato do DPO (obrigatório por lei) |
| `PUT` | `/lgpd/dpo` | `JwtAuthGuard` + `Role('admin')` | Atualiza dados do DPO |

---

## Regras de Negócio

- **Consentimento versionado.** Todo consentimento armazena a versão da política aceita e o hash do texto. Se a política mudar, novos consentimentos referenciam a nova versão; os anteriores são mantidos como evidência histórica.
- **PII criptografada em repouso.** `titular_email` em `DataSubjectRequest`, `email` e `telefone` em `DpoContact`, e campos PII de clientes (módulo 12) e usuários do e-commerce (módulo 13) são criptografados com AES-256-GCM. A chave de criptografia vem de variável de ambiente.
- **Log de auditoria imutável.** `PersonalDataAuditLog` é append-only. Nenhum registro pode ser deletado ou atualizado. Implementar via permissão de banco (sem `DELETE`/`UPDATE` para o usuário da aplicação nessa tabela).
- **Prazo legal de 15 dias úteis.** `prazo_legal_at` é calculado automaticamente ao criar `DataSubjectRequest`. O sistema deve alertar o DPO quando uma solicitação estiver a 3 dias do prazo sem resposta.
- **Exportação de dados gera job assíncrono.** O ZIP com todos os dados do titular é gerado pelo worker e armazenado no S3/R2 com expiração de 72 horas. A URL é assinada e de uso único.
- **Exclusão de dados.** A solicitação de exclusão (`tipo = EXCLUSAO`) requer análise do DPO antes de execução. O DPO aprova, o worker executa (anonimização ou deleção conforme a finalidade) e registra log de auditoria.
- **`POST /lgpd/requests` é público** (permite que titulares sem conta no sistema façam solicitação). Deve ter rate limiting agressivo (ex: máx 3 solicitações por e-mail por 24h) para prevenir abuso.
- **Canal do DPO.** `GET /lgpd/dpo` é público e sem autenticação (obrigação legal — Art. 41, §1 LGPD). Deve retornar ao menos o e-mail do DPO.
- **Anotação automática de audit log.** Módulos que manipulam PII (clientes, usuários e-commerce, fornecedores PF) devem publicar eventos para o serviço de audit log. A anotação pode ser feita via interceptor NestJS que detecta rotas marcadas com decorator `@AuditLog()`.

---

## Invariantes Críticos

- **Log de auditoria é imutável.** Nenhuma linha de `PersonalDataAuditLog` pode ser alterada ou removida. Garantir via constraint de banco e permissões do usuário da aplicação (INSERT-only nessa tabela).
- **PII criptografada.** Nenhum dado pessoal sensível é armazenado em texto claro. Falha na criptografia deve bloquear a operação, não silenciar.
- **Consentimento evidenciado.** O hash do texto da política é a evidência de que o titular aceitou exatamente aquele texto. Não alterar políticas retroativamente — versionar sempre.
- **Prazo legal monitorado.** O sistema deve alertar automaticamente antes do vencimento do prazo legal de cada solicitação.
- **Exportação via URL assinada.** Nunca retornar o arquivo de exportação diretamente na resposta HTTP. Sempre via URL assinada com curta expiração.

---

## Dependências

- **Upstream (usa):**
  - Skill `seguranca-lgpd` — criptografia AES-256-GCM, audit log, direitos do titular, base legal
  - RabbitMQ — jobs de exportação e exclusão de dados
  - Módulo `Storage` (módulo 25) — armazenamento do ZIP de exportação
  - Módulo `Configurações da Empresa` (módulo 14) — lê `dpo_email` como canal padrão

- **Downstream (usado por):**
  - Módulo `Clientes` (módulo 12) — registra consentimentos na criação/atualização de clientes; publica eventos de auditoria
  - Módulo `E-commerce` (módulo 13) — consentimento no cadastro e checkout; auditoria de dados de usuário
  - Módulo `Notificações & Alertas` (módulo 20) — alerta DPO sobre prazos de solicitações próximos
  - Todos os módulos com PII — publicam eventos para `PersonalDataAuditLog`

---

## Skills Relevantes

- `nestjs-erp-module` — sempre
- `seguranca-lgpd` — **mandatória**; criptografia, auditoria, consentimento, direitos do titular

---

## Agentes Relevantes

- `construtor-de-modulo` — ao criar o módulo
- `revisor-erp` — após qualquer alteração; verificar imutabilidade do audit log e criptografia de PII
- `auditor-seguranca-lgpd` — **obrigatório** antes de qualquer release que toque neste módulo ou em dados pessoais

---

## Critérios de Aceite

- [ ] `POST /lgpd/consents` registra versão da política, hash do texto e IP de origem.
- [ ] Alterar a política não invalida consentimentos antigos; nova versão cria novo registro.
- [ ] `PersonalDataAuditLog` não pode ter registros deletados ou alterados (constraint de banco verificado via teste de integração).
- [ ] `POST /lgpd/requests` sem autenticação cria solicitação e calcula `prazo_legal_at` corretamente (15 dias úteis).
- [ ] Rate limiting em `POST /lgpd/requests`: máx 3 por e-mail em 24h; excesso retorna `429`.
- [ ] Exportação gera job assíncrono; arquivo disponível em URL assinada com expiração de 72h.
- [ ] `GET /lgpd/dpo` retorna dados do DPO sem autenticação.
- [ ] `GET /lgpd/privacy-policy` retorna política vigente sem autenticação.
- [ ] `titular_email` em `DataSubjectRequest` é persistido criptografado; não aparece em texto claro em nenhuma resposta.
- [ ] Alerta automático ao DPO quando solicitação está a 3 dias do prazo legal sem resposta.
- [ ] Todos os endpoints autenticados retornam `403` para usuários sem role adequada.
- [ ] Todos os endpoints documentados no Swagger.
