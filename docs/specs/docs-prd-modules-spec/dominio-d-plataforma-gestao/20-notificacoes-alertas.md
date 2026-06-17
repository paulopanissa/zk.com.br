# 20. Notificações & Alertas

**Domínio:** Plataforma & Gestão
**Prioridade:** P1
**Path NestJS:** `apps/api/src/modules/notifications/`

---

## Responsabilidade

Gerenciar regras configuráveis de alertas de negócio (estoque crítico, margem abaixo do limiar, desconto excessivo, faixas de preço) e entregar notificações aos usuários do sistema via canal configurado, com processamento assíncrono em fila para não bloquear a requisição.

---

## Entidades

### NotificationRule

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| `id` | `uuid` | PK |
| `unidade_id` | `uuid` | FK → Unit; escopo obrigatório |
| `nome` | `varchar(100)` | Ex: "Estoque crítico — Ração Premium" |
| `tipo` | `enum('ESTOQUE_MINIMO','ESTOQUE_ZERADO','MARGEM_ABAIXO','DESCONTO_ACIMA','PRECO_FORA_FAIXA','VENDA_META_ATINGIDA','VENDA_META_NAO_ATINGIDA')` | Tipo do gatilho |
| `ativo` | `boolean` | Default `true` |
| `escopo_global` | `boolean` | `true` = aplica a todos os produtos da unidade; `false` = aplica apenas aos itens vinculados |
| `limiar_valor` | `integer` | Valor do limiar em centavos ou centésimos de % conforme `tipo`; **nunca float** |
| `canal_entrega` | `enum('EMAIL','PUSH','WEBHOOK','IN_APP')` | Canal de envio |
| `destinatarios` | `uuid[]` | Array de `user_id` que recebem o alerta; vazio = todos os admins |
| `frequencia_minutos` | `integer` | Intervalo mínimo entre re-disparos da mesma regra; previne spam |
| `ultimo_disparo_at` | `timestamptz` | Timestamp do último envio; usado para respeitar `frequencia_minutos` |
| `created_by` | `uuid` | FK → User |
| `created_at` | `timestamptz` | |
| `updated_at` | `timestamptz` | |

### NotificationRuleScope

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| `id` | `uuid` | PK |
| `rule_id` | `uuid` | FK → NotificationRule |
| `entidade_tipo` | `enum('PRODUTO','CATEGORIA','FORNECEDOR','MARCA')` | Tipo de entidade vinculada à regra |
| `entidade_id` | `uuid` | ID da entidade específica |

### Notification

| Campo | Tipo | Regras / Notas |
|-------|------|----------------|
| `id` | `uuid` | PK |
| `rule_id` | `uuid` | FK → NotificationRule; `null` para notificações do sistema |
| `unidade_id` | `uuid` | FK → Unit; escopo |
| `tipo` | `varchar(50)` | Tipo do evento que gerou a notificação |
| `titulo` | `varchar(255)` | Resumo legível |
| `corpo` | `text` | Detalhes da notificação (pode ser JSON estruturado) |
| `canal_entrega` | `enum('EMAIL','PUSH','WEBHOOK','IN_APP')` | Canal usado |
| `destinatario_id` | `uuid` | FK → User; receptor específico |
| `status` | `enum('PENDENTE','PROCESSANDO','ENTREGUE','FALHOU','IGNORADO')` | Status de entrega |
| `tentativas` | `integer` | Número de tentativas de envio; max 3 |
| `erro_mensagem` | `text` | Mensagem de erro da última tentativa; `null` se sucesso |
| `lido_at` | `timestamptz` | Quando o usuário marcou como lido (IN_APP); `null` se não lido |
| `created_at` | `timestamptz` | |
| `processed_at` | `timestamptz` | Quando o worker processou |

---

## Endpoints

| Método | Rota | Guard | Descrição |
|--------|------|-------|-----------|
| `GET` | `/notifications/rules` | `JwtAuthGuard` + `Role('admin')` | Lista regras de alerta (filtros: tipo, ativo) |
| `POST` | `/notifications/rules` | `JwtAuthGuard` + `Role('admin')` | Cria regra de alerta |
| `GET` | `/notifications/rules/:id` | `JwtAuthGuard` + `Role('admin')` | Detalhe da regra com escopos vinculados |
| `PUT` | `/notifications/rules/:id` | `JwtAuthGuard` + `Role('admin')` | Atualiza regra |
| `PATCH` | `/notifications/rules/:id/toggle` | `JwtAuthGuard` + `Role('admin')` | Ativa/desativa regra |
| `DELETE` | `/notifications/rules/:id` | `JwtAuthGuard` + `Role('admin')` | Remove regra |
| `GET` | `/notifications` | `JwtAuthGuard` | Lista notificações do usuário autenticado (paginado) |
| `GET` | `/notifications/unread-count` | `JwtAuthGuard` | Contagem de não lidas (IN_APP) |
| `PATCH` | `/notifications/:id/read` | `JwtAuthGuard` | Marca notificação como lida |
| `PATCH` | `/notifications/read-all` | `JwtAuthGuard` | Marca todas como lidas |
| `GET` | `/notifications/history` | `JwtAuthGuard` + `Role('admin')` | Histórico completo de disparos com status de entrega (paginado) |

---

## Regras de Negócio

- **Processamento assíncrono obrigatório.** A avaliação de regras e o envio de notificações NUNCA ocorrem dentro da requisição HTTP. Todo o trabalho é publicado em fila RabbitMQ e processado pelo `apps/worker`.
- Os eventos que podem disparar avaliação de regras são: movimentação de estoque (baixa de venda, entrada de nota), atualização de preço/margem/desconto de produto, fechamento de caixa do PDV.
- O worker avalia todas as regras ativas da unidade para o evento recebido. Regras com `escopo_global = false` são avaliadas apenas se a entidade afetada estiver em `NotificationRuleScope`.
- `frequencia_minutos` impede re-disparos em menos tempo que o configurado. O worker verifica `ultimo_disparo_at` antes de criar nova `Notification`.
- `limiar_valor` é sempre em unidade inteira: para `ESTOQUE_MINIMO` é em unidades (ex: `5`); para `MARGEM_ABAIXO` é em centésimos de % (ex: `2000` = 20%); para `PRECO_FORA_FAIXA` são dois limiares (campo adicional `limiar_max`).
- Canal `IN_APP`: a `Notification` é criada no banco e o frontend consulta o endpoint de contagem/listagem. Sem WebSocket na Fase 1 (polling simples).
- Canal `EMAIL`: usa os e-mails tipados dos usuários destinatários, configurados no perfil do usuário. O envio é feito pelo worker via serviço de e-mail transacional.
- Canal `WEBHOOK`: POST para a URL configurada na regra com payload JSON padronizado e header de assinatura HMAC.
- Notificações com `status = FALHOU` após 3 tentativas são marcadas como `IGNORADO` e geram log de erro, mas não bloqueiam o sistema.
- `GET /notifications` retorna apenas notificações do usuário autenticado (`destinatario_id = me`). Admin pode ver histórico completo em `/notifications/history`.

---

## Invariantes Críticos

- **Avaliação de regras nunca na requisição HTTP.** Quebrar isto impacta a latência de PDV e entrada de notas. O evento deve ir para fila imediatamente, o worker processa de forma assíncrona.
- **Limiares em inteiro.** Mesma política do resto do sistema: nenhum `float` em limiar de porcentagem ou valor monetário.
- **Escopo de tenancy.** Toda consulta de regras e notificações filtra por `unidade_id` do contexto autenticado.

---

## Dependências

- **Upstream (usa):**
  - RabbitMQ — fila de eventos e de envio de notificações
  - Módulo `Unidades/Lojas` (módulo 15) — escopo por `unidade_id`
  - Módulo `Autenticação` (módulo 23) — lista de usuários destinatários

- **Downstream (usado por):**
  - Módulo `Estoque` (módulo 5) — publica evento de movimentação na fila
  - Módulo `Produtos` (módulo 7) — publica evento de alteração de preço/margem
  - Módulo `PDV` (módulo 11) — publica evento de fechamento de caixa
  - Frontend `admin` — consome `GET /notifications` para exibir sino de notificações

---

## Skills Relevantes

- `nestjs-erp-module` — sempre
- `estoque-lote-fifo` — para contexto dos eventos de movimentação que disparam alertas

---

## Agentes Relevantes

- `construtor-de-modulo` — ao criar o módulo
- `revisor-erp` — após alterações; verificar que nenhum processamento pesado está na requisição

---

## Critérios de Aceite

- [ ] Criar regra de `ESTOQUE_MINIMO` com limiar 5; baixar estoque para 4 dispara a notificação via fila (não na requisição).
- [ ] Segunda movimentação dentro do período `frequencia_minutos` não gera nova notificação.
- [ ] `GET /notifications/unread-count` retorna apenas notificações IN_APP do usuário autenticado.
- [ ] Usuário sem role `admin` não acessa regras (`403`); acessa apenas suas próprias notificações.
- [ ] Notificação com 3 tentativas falhas é marcada `IGNORADO` e não bloqueia o worker.
- [ ] `PATCH /notifications/read-all` marca apenas notificações do usuário autenticado.
- [ ] Todos os endpoints documentados no Swagger.
