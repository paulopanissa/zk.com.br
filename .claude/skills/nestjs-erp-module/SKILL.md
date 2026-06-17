---
name: nestjs-erp-module
description: Convenções para criar ou editar um módulo de feature na API NestJS deste ERP (catálogo, fornecedores, clientes, cupons, relatórios, etc.). Use SEMPRE que for criar, refatorar ou revisar um módulo, controller, service, repository, DTO ou entidade do backend — mesmo que o pedido seja casual como "cria o módulo de marcas" ou "adiciona um endpoint de fornecedor". Garante a arquitetura API-first, a camada de tenancy isolada, a separação dos dois realms de usuário e a validação de entrada.
---

# Módulo de feature (NestJS) — ERP API-first

A API é o produto. Os frontends (admin, PDV, e-commerce) são clientes "burros": toda regra de negócio mora no backend. Nunca duplique regra no frontend.

## Camadas (obrigatório separar)

- **Controller** — só HTTP: recebe DTO, chama o service, devolve resposta. Sem regra de negócio, sem acesso a banco.
- **Service** — regra de negócio. Orquestra repositórios, valida invariantes de domínio, lança exceções de domínio.
- **Repository** — acesso a dados. Toda query passa por aqui.

Nunca pule camadas (controller acessando repositório direto é proibido).

## Layout do módulo

```
modules/<feature>/
├── <feature>.controller.ts
├── <feature>.service.ts
├── <feature>.repository.ts
├── <feature>.module.ts
├── dto/  (create, update, query/filtros)
└── entities/
```

## Validação de entrada

- Todo input chega como DTO com `class-validator`. Nunca confie no cliente.
- Use `ValidationPipe` global com `whitelist: true` e `forbidNonWhitelisted: true` para descartar campos não esperados.
- CNPJ/CPF, e-mail, telefone etc. seguem a skill `fiscal-br` (validação real, não só formato).

## Tenancy e multi-loja (crítico para o futuro)

Hoje o sistema é single-tenant com uma única loja (matriz), mas a API será reaproveitada por outros clientes depois. Para não sofrer:

- Toda consulta a dados de negócio passa por uma **camada de escopo** que hoje filtra por `unidade_id` (loja) e foi desenhada para também filtrar por `tenant_id` no futuro.
- Nunca escreva query crua que ignore o escopo. O escopo é resolvido a partir do contexto da requisição (usuário autenticado), nunca de parâmetro vindo do cliente.

## Autenticação e autorização

- **Dois realms separados**: usuários do sistema (admin/PDV) e usuários do e-commerce vivem em schemas distintos, com tokens e guards distintos. Nunca compartilhe credencial ou escopo entre eles.
- Toda rota tem guard de autenticação e checagem de permissão (RBAC). Rotas públicas são a exceção explícita, nunca o padrão.

## Padrões de resposta

- Erros de domínio são exceções tipadas mapeadas para o status HTTP correto (ex: `NotFoundException`, `ConflictException`). Não vaze stack trace nem detalhe interno.
- Listagens são sempre paginadas (page/limit) e suportam filtros via DTO de query.
- Documente cada endpoint com decorators Swagger/OpenAPI (`@ApiTags`, `@ApiOperation`, DTOs tipados). A doc da API faz parte da entrega.

## Operações pesadas ou assíncronas

Nunca faça trabalho pesado (emissão de nota, geração de relatório grande, sync do PDV, notificações em massa) dentro do ciclo da requisição. Publique na fila (RabbitMQ) e processe em worker. Isso mantém a API respondendo sob carga (ver skill `estoque-lote-fifo` para concorrência e `seguranca-lgpd` para limites).

## Checklist antes de considerar o módulo pronto

- [ ] Controller sem regra de negócio; service sem HTTP; repository concentra o acesso a dados.
- [ ] DTOs com validação; `whitelist` ativo.
- [ ] Toda query passa pela camada de escopo (unidade/tenant).
- [ ] Guards de auth + RBAC em todas as rotas.
- [ ] Endpoints documentados no Swagger.
- [ ] Trabalho pesado delegado à fila.

## Agentes relacionados

- `construtor-de-modulo` gera o módulo seguindo esta skill.
- `revisor-erp` revisa o resultado contra os invariantes do projeto.
