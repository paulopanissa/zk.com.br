# 16. Configuração de Pagamentos

**Domínio:** Plataforma & Gestão
**Prioridade:** P1
**Path NestJS:** `apps/api/src/modules/payment-config/`

---

## Responsabilidade

Registrar e gerenciar os provedores de pagamento habilitados, mapear qual provedor atende cada canal (PDV e E-commerce) e cada método de pagamento (cartão, PIX, boleto), de forma que nenhum gateway fique hardcoded na aplicação.

---

## Entidades

### PaymentProvider

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| `id` | `uuid` | PK |
| `slug` | `enum('ASAAS','MERCADO_PAGO','STRIPE','PAGSEGURO','PAYPAL')` | Identifica o provedor; único |
| `nome_exibicao` | `varchar(100)` | Ex: "Mercado Pago" |
| `ativo` | `boolean` | Default `false`; habilitar explicitamente |
| `webhook_secret` | `text` | **Criptografado em repouso** (AES-256); nunca retornado em GET |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### PaymentProviderCredential

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| `id` | `uuid` | PK |
| `provider_id` | `uuid` | FK → PaymentProvider |
| `chave` | `varchar(100)` | Nome da credencial, ex: `ACCESS_TOKEN`, `PUBLIC_KEY`, `CLIENT_ID` |
| `valor` | `text` | **Criptografado em repouso** (AES-256); nunca retornado em GET |
| `ambiente` | `enum('SANDBOX','PRODUCAO')` | Separação de credenciais por ambiente |

### PaymentChannelConfig

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| `id` | `uuid` | PK |
| `canal` | `enum('PDV','ECOMMERCE')` | Canal de venda; único por canal (constraint) |
| `provider_id` | `uuid` | FK → PaymentProvider; provedor padrão do canal |
| `ambiente` | `enum('SANDBOX','PRODUCAO')` | Ambiente ativo para este canal |
| `updated_at` | `timestamptz` | |

### PaymentMethodMapping

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| `id` | `uuid` | PK |
| `canal` | `enum('PDV','ECOMMERCE')` | Canal |
| `metodo` | `enum('CARTAO_CREDITO','CARTAO_DEBITO','PIX','BOLETO','DINHEIRO','MAQUININHA_POINT')` | Método de pagamento |
| `provider_id` | `uuid` | FK → PaymentProvider; qual provedor atende este método neste canal |
| `ativo` | `boolean` | Default `true` |
| `taxa_percentual` | `integer` | Taxa em centésimos de porcento (ex: 299 = 2,99%); usado pela engine de precificação |
| `taxa_fixa_centavos` | `integer` | Taxa fixa em centavos por transação |

> **Nota:** `(canal, metodo)` é unique constraint — cada método tem exatamente um provedor mapeado por canal.

---

## Endpoints

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| `GET` | `/payment-config/providers` | `JwtAuthGuard` + `Role('admin')` | Lista provedores cadastrados (sem credenciais) |
| `GET` | `/payment-config/providers/:id` | `JwtAuthGuard` + `Role('admin')` | Detalhe do provedor (sem credenciais; indica quais chaves estão configuradas) |
| `PUT` | `/payment-config/providers/:slug/activate` | `JwtAuthGuard` + `Role('admin')` | Habilita provedor |
| `PUT` | `/payment-config/providers/:slug/deactivate` | `JwtAuthGuard` + `Role('admin')` | Desabilita provedor (não remove credenciais) |
| `PUT` | `/payment-config/providers/:slug/credentials` | `JwtAuthGuard` + `Role('admin')` | Upsert de credenciais (recebe e criptografa; nunca retorna os valores) |
| `DELETE` | `/payment-config/providers/:slug/credentials/:key` | `JwtAuthGuard` + `Role('admin')` | Remove uma credencial específica |
| `GET` | `/payment-config/channels` | `JwtAuthGuard` + `Role('admin')` | Lista configuração de canais (PDV e E-commerce) |
| `PUT` | `/payment-config/channels/:canal` | `JwtAuthGuard` + `Role('admin')` | Define provedor padrão e ambiente de um canal |
| `GET` | `/payment-config/methods` | `JwtAuthGuard` + `Role('admin')` | Lista mapeamento de métodos por canal |
| `PUT` | `/payment-config/methods` | `JwtAuthGuard` + `Role('admin')` | Upsert de mapeamento canal+método → provedor |
| `PATCH` | `/payment-config/methods/:id/toggle` | `JwtAuthGuard` + `Role('admin')` | Ativa/desativa método específico |
| `POST` | `/payment-config/providers/:slug/test` | `JwtAuthGuard` + `Role('admin')` | Testa conectividade com o provedor (usa credenciais salvas; retorna status) |

---

## Regras de Negócio

- Nenhum gateway é hardcoded na lógica de PDV ou E-commerce. A resolução do provedor é sempre feita por consulta a esta configuração em runtime.
- O sistema usa o padrão **Strategy**: cada provedor implementa uma interface comum (`IPaymentProvider`); a seleção de qual instância usar é delegada a este módulo.
- Credenciais são criptografadas com AES-256 antes de persistir. A chave de criptografia vem de variável de ambiente, nunca do código ou banco.
- `GET` de credenciais nunca retorna os valores. Retorna apenas as chaves configuradas e se estão preenchidas (ex: `{ "ACCESS_TOKEN": true, "PUBLIC_KEY": true }`).
- `webhook_secret` é usado para verificar assinaturas dos webhooks recebidos. Deve estar configurado antes de habilitar o provedor em produção.
- Habilitar um provedor sem credenciais completas configuradas retorna `422` com lista das chaves faltantes.
- `taxa_percentual` e `taxa_fixa_centavos` são usados pelo módulo Engine de Precificação (módulo 9) para calcular o custo do meio de pagamento na simulação de margem.
- PDV e E-commerce podem usar provedores iguais ou diferentes — essa é a essência desta configuração.
- O mapeamento `MAQUININHA_POINT` só é válido para o canal `PDV` com provider `MERCADO_PAGO`.
- Alterar o provedor de um canal em produção é uma ação de alto impacto; considerar log de auditoria com `who + when + old_value + new_value`.

---

## Invariantes Críticos

- **Credenciais nunca em texto claro no banco.** Toda credencial é criptografada antes do `INSERT`/`UPDATE`. Nenhum endpoint de leitura retorna o valor.
- **Gateway é configuração, nunca código.** Nenhum módulo de venda importa diretamente uma SDK de gateway; toda integração passa pela abstração de providers.
- **Webhooks com assinatura verificada.** O `webhook_secret` deve ser verificado em toda mensagem recebida. Webhooks sem assinatura válida são rejeitados com `401`.
- **Idempotência de webhooks.** O processamento de eventos de pagamento deve ser idempotente — mesmo evento recebido duas vezes não gera cobrança ou liquidação duplicada.

---

## Dependências

- **Upstream (usa):**
  - Skill `pagamentos` — padrões de abstração de gateway, idempotência, webhook
  - Skill `seguranca-lgpd` — criptografia de credenciais em repouso

- **Downstream (usado por):**
  - Módulo `PDV` (módulo 11) — resolve qual provedor/método usar na finalização
  - Módulo `E-commerce` (módulo 13) — resolve gateway de checkout
  - Módulo `Engine de Precificação` (módulo 9) — lê taxas por método para calcular margem
  - Módulo `Unidades/Lojas` (módulo 15) — override de gateway por unidade
  - Módulo `Notificações & Alertas` (módulo 20) — alertas sobre falhas de pagamento

---

## Skills Relevantes

- `nestjs-erp-module` — sempre
- `pagamentos` — abstração de provedores, strategy pattern, webhook, idempotência
- `seguranca-lgpd` — criptografia de credenciais, segredos fora do código

---

## Agentes Relevantes

- `construtor-de-modulo` — ao criar o módulo
- `revisor-erp` — após alterações; verificar que credenciais nunca trafegam em claro
- `auditor-seguranca-lgpd` — antes de qualquer release que toque em credenciais ou webhooks

---

## Critérios de Aceite

- [ ] `PUT credentials` persiste credenciais criptografadas; `GET` retorna apenas as chaves (sem valores).
- [ ] Habilitar provedor sem credenciais obrigatórias retorna `422` com lista das chaves faltantes.
- [ ] PDV e E-commerce podem ter provedores distintos configurados simultaneamente.
- [ ] Mapeamento `MAQUININHA_POINT` é validado para existir apenas no canal `PDV` com provider `MERCADO_PAGO`.
- [ ] Webhook com assinatura inválida é rejeitado com `401`.
- [ ] Mesmo webhook recebido duas vezes não duplica o efeito (idempotência verificada por `event_id`).
- [ ] `taxa_percentual` e `taxa_fixa_centavos` são retornados na listagem de métodos para uso da engine de precificação.
- [ ] Todos os endpoints retornam `403` para usuários sem role `admin`.
- [ ] Todos os endpoints documentados no Swagger.
