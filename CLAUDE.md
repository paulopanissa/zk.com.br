# CLAUDE.md

Guia operacional do projeto para o Claude Code. Leia isto antes de qualquer tarefa. Para o escopo completo veja o **PRD** (`PRD-ERP-Ecommerce-PDV.md`); para convenções detalhadas de cada área, consulte as **skills** listadas no fim deste arquivo.

---

## O que é

Plataforma única de varejo: **ERP (admin) + PDV + E-commerce** sobre uma **API RESTful** central. Os frontends são clientes da API — toda regra de negócio mora no backend. Ramo inicial: pet shop. A API é pensada para ser reaproveitada por outros clientes no futuro.

## Stack

- **NestJS** (API RESTful) sobre Node.js
- **PostgreSQL** (banco), **Redis** (cache), **RabbitMQ** (filas)
- **S3 / R2** (storage: logos, mídias, XMLs e PDFs)
- Busca: **PostgreSQL full-text + `pg_trgm`** (motor dedicado só em escala extrema)

---

## Estrutura do repositório (monorepo)

O projeto é um **monorepo** (pnpm workspaces + Turborepo ou Nx). Monorepo **não** é deploy monolítico: cada app builda e sobe de forma independente, e a API permanece um deployável e versionável próprio.

```
repo/
├── apps/
│   ├── api/          # NestJS (o produto central)
│   ├── worker/       # consumidores de fila (emissão, sync PDV, notificações)
│   ├── admin/        # frontend do ERP
│   ├── pdv/          # frontend do PDV (PWA, offline-capable)
│   └── ecommerce/    # frontend da loja
└── packages/
    ├── contracts/    # DTOs/tipos + client gerado do OpenAPI (contrato único API↔frontends)
    ├── domain/       # enums e regras de domínio compartilhadas (CFOP, CST, formas de pagamento, etc.)
    └── ui/           # design tokens / componentes compartilhados pelos frontends
```

**Regras do monorepo:**
- O contrato entre API e frontends vive em `packages/contracts` — nenhuma duplicação de tipos/DTOs; mudou o DTO, atualiza os consumidores no mesmo commit.
- Fronteiras são reais: frontends importam de `contracts`/`domain`/`ui`, nunca do código interno de `apps/api`.
- A API é independente e versionada. Reaproveitamento futuro por outros clientes se faz publicando `contracts` e construindo o frontend contra a API — ou destacando um frontend para repo próprio **só quando** um cliente exigir isolamento de fonte. Separar depois é fácil; juntar depois é difícil.

---

## Princípios de arquitetura (não negociáveis)

1. **API-first.** Nenhuma regra de negócio no frontend. Se a regra importa, ela vive no backend.
2. **Camadas separadas.** Controller (só HTTP) → Service (regra de negócio) → Repository (acesso a dados). Nunca pule camadas.
3. **Tenancy isolada.** Single-tenant + multi-loja hoje. Toda query de dados de negócio passa por uma camada de escopo que filtra por `unidade_id` e foi desenhada para também filtrar por `tenant_id` depois. Escopo vem do contexto autenticado, **nunca** de parâmetro do cliente.
4. **Dois realms de usuário.** Usuários do sistema (admin/PDV) e do e-commerce ficam em schemas separados, com auth e tokens distintos. Nunca cruze escopos nem use uma tabela única.
5. **Trabalho pesado vai pra fila.** Emissão de nota, relatórios grandes, sync do PDV e notificações em massa rodam em worker (RabbitMQ), nunca dentro da requisição.

## Invariantes críticos (quebrar isto causa bug grave)

- **Estoque:** saldo é sempre derivado de movimentações (`stock_movement`); nunca mutar um campo de saldo. Baixa em transação com `SELECT ... FOR UPDATE` nos lotes (FIFO por validade) e idempotência por id da venda. → skill `estoque-lote-fifo`
- **Dinheiro:** sempre inteiro em centavos (ou decimal de precisão fixa). Nunca `float`. → skill `precificacao`
- **Pagamento:** gateway é configuração (por canal e método), nunca chumbado. Nenhum dado de cartão trafega ou é armazenado na API. Webhooks idempotentes e com assinatura verificada. → skill `pagamentos`
- **Fiscal:** CNPJ/CPF validados por dígito (não só máscara) e armazenados só com dígitos. Emissão de NFe/NFCe via plataforma paga, **nunca** integração direta com a SEFAZ. → skill `fiscal-br`
- **Segurança/LGPD:** PII criptografada em repouso; consentimento versionado; direitos do titular (exportar/excluir); segredos fora do código; queries parametrizadas; rate limiting. → skill `seguranca-lgpd`

---

## Estrutura de um módulo de feature

Dentro de `apps/api/src/modules/`:

```
modules/<feature>/
├── <feature>.controller.ts   # só HTTP
├── <feature>.service.ts      # regra de negócio
├── <feature>.repository.ts   # acesso a dados
├── <feature>.module.ts
├── dto/                      # create / update / query (class-validator)
└── entities/
```

→ Use a skill `nestjs-erp-module` ao criar/editar qualquer módulo.

## Convenções

- **Entrada:** todo input é DTO com `class-validator`. `ValidationPipe` global com `whitelist: true` e `forbidNonWhitelisted: true`.
- **Erros:** exceções de domínio tipadas mapeadas pro HTTP correto. Nunca vazar stack trace ou detalhe interno.
- **Listagens:** sempre paginadas (page/limit) + filtros via DTO de query.
- **Docs:** todo endpoint documentado no Swagger/OpenAPI. A doc faz parte da entrega.
- **Auth:** guard de autenticação + RBAC em toda rota. Rota pública é exceção explícita.
- **Nomes:** módulos em kebab-case; arquivos `<feature>.<camada>.ts`.

---

## Comandos

> Ajuste conforme o setup real do repositório; abaixo os padrões esperados. No monorepo, os comandos rodam por app via o runner do workspace (ex: `pnpm --filter api start:dev` ou `turbo run dev --filter=api`).

```bash
npm run start:dev      # subir a API em desenvolvimento
npm run build          # build de produção
npm run test           # testes unitários
npm run test:e2e       # testes de integração
npm run lint           # lint + format check
```

- **ORM:** Prisma 5. Schema em `apps/api/prisma/schema.prisma`. Comandos:
  ```bash
  pnpm --filter @zk/api prisma:generate   # gera o client após alterar schema
  pnpm --filter @zk/api prisma:migrate    # cria e aplica migration (dev)
  pnpm --filter @zk/api prisma:studio     # UI visual do banco
  ```
  Nunca alterar schema em produção sem migration versionada.
- **Infra local:** `docker compose up -d` na raiz sobe Postgres (5432), Redis (6379) e RabbitMQ (5672 + UI 15672). Copie `apps/api/.env.example` → `apps/api/.env` antes de subir a API.

---

## Antes de abrir PR (definition of done)

- [ ] Camadas respeitadas (controller sem regra, repository concentra dados).
- [ ] DTOs com validação; whitelist ativa.
- [ ] Toda query passa pela camada de escopo (unidade/tenant).
- [ ] Guards de auth + RBAC nas rotas; nada público por acidente.
- [ ] Invariantes críticos respeitados (estoque, dinheiro, pagamento, fiscal, LGPD).
- [ ] Endpoints documentados no Swagger.
- [ ] Trabalho pesado na fila, não na requisição.
- [ ] Testes cobrindo o caminho feliz e os erros principais.

---

## Skills do projeto (consulte conforme a tarefa)

| Skill | Quando usar |
|-------|-------------|
| `nestjs-erp-module` | Criar/editar qualquer módulo, controller, service, DTO ou entidade. |
| `estoque-lote-fifo` | Estoque, lotes, validade, movimentação, baixa em venda. |
| `fiscal-br` | CNPJ/CPF, XML de nota, campos fiscais do produto, emissão de NFe/NFCe. |
| `pagamentos` | Gateways, maquininha Point, PIX, checkout, webhooks, conciliação. |
| `seguranca-lgpd` | Auth, dados pessoais, criptografia, consentimento, rate limiting, segredos. |
| `precificacao` | Preço, margem, markup, desconto, centro de custo, calculadora. |
| `seo-ecommerce` | SEO técnico e de conteúdo do e-commerce — Schema.org JSON-LD, meta tags, Core Web Vitals, URLs, sitemap, robots.txt, paginação. Use ao trabalhar em qualquer página, rota ou dado do e-commerce que afete indexação. |

As skills ficam em `.claude/skills/<nome>/SKILL.md` (commitadas no repo).

## Agentes (Claude Code)

Subagentes especializados em `.claude/agents/<nome>.md` (commitados no repo). O Claude delega tarefas a eles; cada um consulta o CLAUDE.md e as skills antes de agir. Os de revisão/auditoria são só-leitura.

| Agente | Quando usar |
|--------|-------------|
| `revisor-erp` | Proativamente após escrever/alterar código, antes de commit/PR: revisa o diff contra os invariantes críticos. |
| `construtor-de-modulo` | Criar um módulo, CRUD ou endpoint novo no backend, no padrão do projeto. |
| `escritor-de-testes` | Adicionou/alterou lógica de estoque, pagamento, preço, fiscal ou validação; quer testes nos caminhos de risco. |
| `auditor-seguranca-lgpd` | Antes de releases sensíveis e ao mexer em dados pessoais, auth ou segredos (foco interno/LGPD). |
| `seguranca-ecommerce` | Mexeu em endpoint público, login de cliente, carrinho, checkout ou pagamento da loja; antes de subir o e-commerce. |
| `seo-ecommerce` | Ao implementar ou alterar qualquer página, componente, rota ou dado do e-commerce (produto, categoria, home, busca, sitemap); antes de subir o e-commerce para produção. |

## Convenção de Issues

**Toda feature, módulo ou spec do PRD deve ter um GitHub Issue antes da implementação.**

- Crie o issue **antes** de abrir a branch — o número do issue entra no nome da branch: `feat/<ID>-<slug>`
- O issue é a fonte de rastreabilidade: liga o spec → branch → PR
- Ao abrir o PR, vincule ao issue no body (`Closes #<ID>`) e mencione no título quando relevante
- Issues retroativos (trabalho já feito sem issue) devem ser criados e fechados pelo PR correspondente

Isso vale para: novos módulos, endpoints, schemas, migrations, integrações externas. Não se aplica a hotfixes triviais ou refactors isolados de 1 arquivo.

## Configuração do Projeto

- isLibPackage: false
- mainBranch: main
- prBranch: main
- orchestrator:
  - taskManager: github
  - prPlatform: github
  - documentation: local
  - design: none

## Referências

- `PRD-ERP-Ecommerce-PDV.md` — escopo completo, 28 módulos, decisões de arquitetura e faseamento.
