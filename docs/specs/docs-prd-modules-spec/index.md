# Specs dos Módulos — ERP + PDV + E-commerce

Especificações técnicas dos 28 módulos do PRD. Cada arquivo detalha entidades, endpoints, regras de negócio, invariantes críticos, skills e agentes relevantes.

---

## Faseamento

| Fase | Prioridade | Foco |
|------|-----------|------|
| Fase 1 | P0 | Núcleo ERP — base de gestão, suprimentos, estoque, precificação, clientes, busca, segurança/LGPD |
| Fase 2 | P1 | Vendas — PDV, pagamento integrado, cupons, alertas, relatórios |
| Fase 3 | P2 | E-commerce & Fiscal — loja online, emissão fiscal, entregas, gateways online |

---

## Domínio A — Catálogo & Suprimentos

| # | Módulo | Prioridade | Arquivo |
|---|--------|-----------|---------|
| 1 | Marcas | P0 | [01-marcas.md](dominio-a-catalogo-suprimentos/01-marcas.md) |
| 2 | Fornecedores | P0 | [02-fornecedores.md](dominio-a-catalogo-suprimentos/02-fornecedores.md) |
| 3 | Notas Fiscais de Entrada | P0 | [03-notas-fiscais.md](dominio-a-catalogo-suprimentos/03-notas-fiscais.md) |
| 4 | Lotes | P0 | [04-lotes.md](dominio-a-catalogo-suprimentos/04-lotes.md) |
| 5 | Estoque | P0 | [05-estoque.md](dominio-a-catalogo-suprimentos/05-estoque.md) |
| 6 | Categorias / Subcategorias | P0 | [06-categorias.md](dominio-a-catalogo-suprimentos/06-categorias.md) |
| 7 | Produtos | P0 | [07-produtos.md](dominio-a-catalogo-suprimentos/07-produtos.md) |

## Domínio B — Comercial & Precificação

| # | Módulo | Prioridade | Arquivo |
|---|--------|-----------|---------|
| 8 | Centro de Custo | P0 | [08-centro-de-custo.md](dominio-b-comercial-precificacao/08-centro-de-custo.md) |
| 9 | Engine de Precificação | P0 | [09-engine-precificacao.md](dominio-b-comercial-precificacao/09-engine-precificacao.md) |
| 10 | Cupons | P1 | [10-cupons.md](dominio-b-comercial-precificacao/10-cupons.md) |

## Domínio C — Vendas

| # | Módulo | Prioridade | Arquivo |
|---|--------|-----------|---------|
| 11 | PDV | P1 | [11-pdv.md](dominio-c-vendas/11-pdv.md) |
| 12 | Clientes | P0 | [12-clientes.md](dominio-c-vendas/12-clientes.md) |
| 13 | E-commerce | P2 | [13-ecommerce.md](dominio-c-vendas/13-ecommerce.md) |

## Domínio D — Plataforma & Gestão

| # | Módulo | Prioridade | Arquivo |
|---|--------|-----------|---------|
| 14 | Configurações da Empresa | P0 | [14-configuracoes-empresa.md](dominio-d-plataforma-gestao/14-configuracoes-empresa.md) |
| 15 | Unidades / Lojas | P0 | [15-unidades-lojas.md](dominio-d-plataforma-gestao/15-unidades-lojas.md) |
| 16 | Configuração de Pagamentos | P0 | [16-config-pagamentos.md](dominio-d-plataforma-gestao/16-config-pagamentos.md) |
| 17 | Configuração de Entregas | P2 | [17-config-entregas.md](dominio-d-plataforma-gestao/17-config-entregas.md) |
| 18 | Configuração de Impostos | P0 | [18-config-impostos.md](dominio-d-plataforma-gestao/18-config-impostos.md) |
| 19 | API Keys de IA | P1 | [19-api-keys-ia.md](dominio-d-plataforma-gestao/19-api-keys-ia.md) |
| 20 | Notificações & Alertas | P1 | [20-notificacoes-alertas.md](dominio-d-plataforma-gestao/20-notificacoes-alertas.md) |
| 21 | Relatórios | P1 | [21-relatorios.md](dominio-d-plataforma-gestao/21-relatorios.md) |
| 22 | LGPD | P0 | [22-lgpd.md](dominio-d-plataforma-gestao/22-lgpd.md) |

## Transversais & Infraestrutura

| # | Módulo | Prioridade | Arquivo |
|---|--------|-----------|---------|
| 23 | Autenticação & Autorização | P0 | [23-autenticacao-autorizacao.md](transversais/23-autenticacao-autorizacao.md) |
| 24 | Busca Global (omnisearch) | P0 | [24-busca-global.md](transversais/24-busca-global.md) |
| 25 | Storage (S3/R2) | P0 | [25-storage.md](transversais/25-storage.md) |
| 26 | Integração Fiscal | P2 | [26-integracao-fiscal.md](transversais/26-integracao-fiscal.md) |
| 27 | Integração de IA | P1 | [27-integracao-ia.md](transversais/27-integracao-ia.md) |
| 28 | Seeder | P0 | [28-seeder.md](transversais/28-seeder.md) |

---

## Skills do Projeto

| Skill | Quando usar |
|-------|-------------|
| `nestjs-erp-module` | Criar/editar qualquer módulo, controller, service, DTO ou entidade |
| `estoque-lote-fifo` | Módulos 3, 4, 5, 11 — qualquer lógica de lote, FIFO ou movimentação |
| `fiscal-br` | Módulos 2, 3, 7, 14, 18 — CNPJ/CPF, campos fiscais, XML de nota |
| `pagamentos` | Módulos 11, 16 — gateways, Point, PIX, webhooks |
| `seguranca-lgpd` | Módulos 12, 14, 19, 22, 23 — PII, auth, criptografia, consentimento |

## Agentes do Projeto

| Agente | Quando usar |
|--------|-------------|
| `construtor-de-modulo` | Criar módulo, CRUD ou endpoint novo |
| `revisor-erp` | Proativamente após qualquer alteração de código |
| `escritor-de-testes` | Após lógica de estoque, pagamento, preço, fiscal ou validação |
| `auditor-seguranca-lgpd` | Antes de releases com dados pessoais, auth ou segredos |
| `seguranca-ecommerce` | Antes de subir endpoints públicos, login de cliente, checkout |
