# 13. E-commerce

**Domínio:** Vendas
**Prioridade:** P2 — Fase Futura
**Path NestJS:** `apps/api/src/modules/ecommerce/` *(a definir na Fase 3)*

---

> **ATENÇÃO — FASE FUTURA (P2)**
>
> Este módulo pertence à Fase 3 do produto (E-commerce & Fiscal). Ele **não deve ser implementado** nas Fases 1 (P0) ou 2 (P1). Esta especificação documenta o escopo planejado e as decisões de arquitetura já tomadas para orientar as fases anteriores a não criar impedimentos para a implementação futura.
>
> Endpoints e detalhes de implementação **não são especificados aqui** — serão detalhados num PRD dedicado quando a fase 3 for iniciada.

---

## Responsabilidade

Operar a loja online da plataforma: catálogo público, carrinho, checkout com pagamento online e emissão de NFe/NFCe — com base de usuários completamente separada do realm do sistema (PDV/ERP).

---

## Escopo Planejado

### Catálogo público

- Listagem e busca de produtos com filtros facetados (categoria, marca, faixa de preço).
- Página de produto com detalhes, mídias, variações e disponibilidade de estoque em tempo real.
- Busca otimizada para conversão — possivelmente motor dedicado (Meilisearch/Typesense) se o volume justificar.
- Geração e servir Schema.org / JSON-LD dos produtos para SEO (campos já presentes no módulo 7).

### Usuários do e-commerce

- Realm completamente separado do realm do sistema (schema e tokens distintos — decisão arquitetural já tomada no PRD, seção 5, item 6).
- Cadastro, login, recuperação de senha e perfil do cliente da loja.
- PII criptografada em repouso, consentimento LGPD versionado — mesmas regras do módulo 12 mas em realm próprio.
- Endereços de entrega múltiplos por cliente.

### Carrinho

- Carrinho persistido no servidor (não só em localStorage) para continuidade entre sessões e dispositivos.
- Validação de disponibilidade de estoque ao adicionar item e ao iniciar checkout.
- Aplicação de cupons (módulo 10) no carrinho online.

### Checkout e pagamento

- Gateway de pagamento configurável (módulo 16) — canal E-commerce configurado de forma independente do canal PDV.
- Suporte a: cartão de crédito/débito, PIX, boleto (conforme gateway habilitado).
- Nenhum dado de cartão trafega ou é armazenado na API — tokenização delegada ao gateway (PCI-DSS).
- Webhooks de pagamento idempotentes e com assinatura verificada.

### Entrega

- Integração com Superfrete ou outra API de frete (módulo 17 — Configuração de Entregas).
- Entrega local (Uber/InDrive).
- Cálculo de frete no checkout com base no CEP de destino.

### Emissão fiscal

- Emissão de NFe/NFCe via plataforma paga (Focus NFe / eNotas / NFe.io) — nunca integração direta com a SEFAZ (decisão arquitetural já tomada, PRD seção 5, item 5).
- Campos fiscais do produto (NCM, CFOP, CEST, CST/CSOSN) já estão no módulo 7 — sem retrabalho.
- XML e PDF da nota armazenados no S3/R2 (módulo 25).
- Emissão enfileirada via RabbitMQ (worker), nunca dentro da requisição.

### Gestão de pedidos

- Ciclo de vida do pedido: `PENDENTE` → `PAGO` → `EM_PREPARACAO` → `ENVIADO` → `ENTREGUE` / `CANCELADO` / `DEVOLVIDO`.
- Notificações ao cliente em cada mudança de status (e-mail ou WhatsApp via worker).
- Interface de gestão de pedidos no admin (ERP).

---

## Decisões Arquiteturais Já Tomadas (não alterar nas fases anteriores)

| Decisão | Referência |
|---------|-----------|
| Usuários do e-commerce em schema separado do realm do sistema | PRD seção 5, item 6 |
| Gateway configurável por canal (E-commerce ≠ PDV) | PRD seção 5, item 9 |
| Emissão fiscal via plataforma paga, nunca SEFAZ direto | PRD seção 5, item 5 |
| Campos fiscais do produto (NCM, CFOP etc.) no modelo desde o P0 | PRD seção 8, módulo 7 |
| Busca facetada: Postgres FTS por padrão; motor dedicado só em escala extrema | PRD seção 5, item 7 |
| Trabalho pesado (emissão, notificações) sempre em fila RabbitMQ | CLAUDE.md princípio 5 |

---

## Impacto nas Fases Anteriores (P0 e P1)

Os módulos das Fases 1 e 2 devem ser construídos de forma a **não impedir** a implementação futura do e-commerce:

- **Módulo 7 (Produtos):** campos fiscais (NCM, CFOP, CEST, CST/CSOSN), mídias e Schema.org já devem existir no P0.
- **Módulo 10 (Cupons):** o campo `canal` em `CouponUsage` (`PDV` ou `ECOMMERCE`) já deve existir no P1 para reutilização direta no P2.
- **Módulo 16 (Configuração de Pagamentos):** o mapeamento por canal (PDV e ECOMMERCE) deve existir desde o P1.
- **Módulo 23 (Auth):** a separação de realms deve ser implementada desde o P0 — nenhuma refatoração de auth na Fase 3.
- **Módulo 5 (Estoque):** a baixa por lote FIFO com idempotência por `pedido_id` (além de `venda_id`) deve ser considerada no design do P0.

---

## Dependências Previstas

- **Upstream (usará):**
  - `Produtos` (módulo 7) — catálogo, mídias, campos fiscais
  - `Estoque` (módulo 5) — disponibilidade e baixa por pedido
  - `Cupons` (módulo 10) — desconto no carrinho online
  - `Configuração de Pagamentos` (módulo 16) — gateway canal ECOMMERCE
  - `Configuração de Entregas` (módulo 17) — cálculo de frete
  - `Configuração de Impostos` (módulo 18) — alíquotas para emissão fiscal
  - `Autenticação & Autorização` (módulo 23) — realm separado de clientes da loja
  - `Storage S3/R2` (módulo 25) — XMLs e PDFs de notas
  - `Integração Fiscal` (módulo 26) — emissão NFe/NFCe

- **Downstream (usado por):**
  - `Relatórios` (módulo 21) — pedidos online
  - `Notificações & Alertas` (módulo 20) — status de pedido

---

## Skills Relevantes (para quando a implementação for iniciada)

- `nestjs-erp-module` — estrutura padrão
- `pagamentos` — gateway online, webhooks, PCI-DSS
- `fiscal-br` — emissão NFe/NFCe, XML, validação fiscal
- `estoque-lote-fifo` — baixa por pedido com idempotência
- `seguranca-lgpd` — realm de usuários da loja, PII, consentimento

---

## Agentes Relevantes (para quando a implementação for iniciada)

- `construtor-de-modulo` — ao criar os submódulos
- `revisor-erp` — após alterações
- `seguranca-ecommerce` — obrigatório antes de qualquer deploy da loja online
- `auditor-seguranca-lgpd` — usuários da loja, dados pessoais, checkout

---

## Critérios de Aceite (a detalhar na Fase 3)

> Os critérios de aceite detalhados serão definidos no PRD da Fase 3, quando o escopo for refinado. Os seguintes são requisitos mínimos não-negociáveis:

- [ ] Usuários do e-commerce não compartilham schema, tabela ou token com usuários do sistema (PDV/ERP).
- [ ] Nenhum dado de cartão trafega ou é armazenado na API.
- [ ] Webhooks de pagamento são idempotentes e validam assinatura antes de processar.
- [ ] Emissão de nota é assíncrona via worker; falha no serviço fiscal não impede a confirmação do pedido.
- [ ] Baixa de estoque por pedido é idempotente: retry não gera dupla dedução.
- [ ] Consentimento LGPD versionado é coletado e persistido no cadastro do cliente da loja.
