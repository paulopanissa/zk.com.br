# 17. Configuração de Entregas

**Domínio:** Plataforma & Gestão
**Prioridade:** P2 (Fase E-commerce)
**Path NestJS:** `apps/api/src/modules/delivery-config/`

---

## Responsabilidade

Registrar e gerenciar provedores e regras de entrega (transportadoras, APIs de frete e entrega local), mapeando qual modalidade está disponível para cada canal de venda.

> **FASE FUTURA — P2.** Este módulo faz parte da Fase 3 (E-commerce & Fiscal). As entidades e endpoints aqui descritos representam o escopo esperado, mas a implementação **não deve iniciar** antes da Fase 3 ser formalmente aberta. O modelo de dados pode ser scaffolded (migration vazia) na Fase 1 para reservar o espaço no schema, mas sem lógica de negócio.

---

## Entidades

### DeliveryProvider

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| `id` | `uuid` | PK |
| `slug` | `enum('SUPERFRETE','MELHOR_ENVIO','CORREIOS','UBER_DIRECT','INDRIVE','API_PROPRIA','RETIRADA_LOJA')` | Identificador do provedor |
| `nome_exibicao` | `varchar(100)` | Nome amigável |
| `tipo` | `enum('TRANSPORTADORA','ENTREGA_LOCAL','RETIRADA')` | Categoria |
| `ativo` | `boolean` | Default `false` |
| `webhook_secret` | `text` | Criptografado; para notificações de status de entrega |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### DeliveryProviderCredential

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| `id` | `uuid` | PK |
| `provider_id` | `uuid` | FK → DeliveryProvider |
| `chave` | `varchar(100)` | Nome da credencial (ex: `TOKEN`, `STORE_ID`) |
| `valor` | `text` | **Criptografado em repouso** |
| `ambiente` | `enum('SANDBOX','PRODUCAO')` | |

### DeliveryRule

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| `id` | `uuid` | PK |
| `provider_id` | `uuid` | FK → DeliveryProvider |
| `nome` | `varchar(100)` | Ex: "Entrega expressa SP", "PAC até 5 kg" |
| `prazo_dias_min` | `integer` | SLA mínimo em dias úteis |
| `prazo_dias_max` | `integer` | SLA máximo em dias úteis |
| `preco_fixo_centavos` | `integer` | Preço fixo em centavos; `null` = cotação dinâmica via API |
| `frete_gratis_acima_centavos` | `integer` | Limiar para frete grátis; `null` = não se aplica |
| `regioes_atendidas` | `text[]` | Array de CEPs prefixos ou UFs atendidas |
| `ativa` | `boolean` | Default `true` |
| `ordem` | `integer` | Ordem de exibição no checkout |

---

## Endpoints (escopo futuro)

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| `GET` | `/delivery-config/providers` | `JwtAuthGuard` + `Role('admin')` | Lista provedores de entrega |
| `PUT` | `/delivery-config/providers/:slug/activate` | `JwtAuthGuard` + `Role('admin')` | Habilita provedor |
| `PUT` | `/delivery-config/providers/:slug/credentials` | `JwtAuthGuard` + `Role('admin')` | Upsert credenciais (criptografadas) |
| `GET` | `/delivery-config/rules` | `JwtAuthGuard` + `Role('admin')` | Lista regras de entrega |
| `POST` | `/delivery-config/rules` | `JwtAuthGuard` + `Role('admin')` | Cria regra de entrega |
| `PUT` | `/delivery-config/rules/:id` | `JwtAuthGuard` + `Role('admin')` | Atualiza regra |
| `DELETE` | `/delivery-config/rules/:id` | `JwtAuthGuard` + `Role('admin')` | Remove regra |
| `POST` | `/delivery-config/providers/:slug/quote` | `JwtAuthGuard` + `Role('admin')` | Testa cotação com o provedor |

---

## Regras de Negócio

- Provedores de entrega só são relevantes para o canal **E-commerce**. O PDV não usa este módulo.
- Para entrega local via Uber Direct ou InDrive, o sistema registra a solicitação e acompanha o status via webhook — não há integração síncrona no checkout.
- Cotações dinâmicas (Superfrete, Melhor Envio, Correios) são feitas no momento do checkout do e-commerce passando peso, dimensões e CEP de destino.
- Credenciais são criptografadas da mesma forma que as de pagamento (AES-256, chave em env var).
- `RETIRADA_LOJA` é um provedor especial sem credenciais — representa a opção de o cliente retirar na loja.
- As regras de frete são avaliadas em ordem (`ordem`) e a primeira regra ativa compatível com o pedido é aplicada.

---

## Invariantes Críticos

- **Credenciais nunca em texto claro.** Mesma política do módulo de pagamentos.
- **Fase futura:** nenhuma lógica de cotação ou despacho deve ser implementada antes da Fase 3. O módulo pode existir como scaffold mas sem lógica ativa.

---

## Dependências

- **Upstream (usa):**
  - Skill `seguranca-lgpd` — criptografia de credenciais

- **Downstream (usado por):**
  - Módulo `E-commerce` (módulo 13) — cotação e seleção de frete no checkout
  - Módulo `Produtos` (módulo 7) — dimensões/peso para cotação

---

## Skills Relevantes

- `nestjs-erp-module` — sempre
- `seguranca-lgpd` — criptografia de credenciais

---

## Agentes Relevantes

- `construtor-de-modulo` — ao scaffoldar o módulo na Fase 3
- `revisor-erp` — ao implementar lógica de entrega
- `seguranca-ecommerce` — ao integrar checkout com cotação de frete

---

## Critérios de Aceite

> Critérios aplicáveis somente na Fase 3.

- [ ] Credenciais persistidas criptografadas; GET não retorna valores.
- [ ] `RETIRADA_LOJA` aceito sem credenciais.
- [ ] Regras avaliadas em ordem; primeira compatível é selecionada no checkout.
- [ ] Integração com Superfrete retorna cotações válidas com as credenciais de sandbox.
- [ ] Entrega local (Uber/InDrive) registra solicitação e rastreia status por webhook.
- [ ] Todos os endpoints documentados no Swagger.
