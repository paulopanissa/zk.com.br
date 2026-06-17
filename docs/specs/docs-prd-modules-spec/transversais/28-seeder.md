# 28. Seeder de Dados

**Domínio:** Transversal & Infraestrutura
**Prioridade:** P0
**Path NestJS:** `apps/api/src/database/seeders/` (ou `apps/api/src/common/seeder/`)

---

## Responsabilidade

Popular o banco de dados com dados iniciais suficientes para desenvolvimento e testes, de forma idempotente, cobrindo: empresa, unidade, usuários do sistema, categorias, marcas, fornecedor e produtos base de pet shop.

## Entidades / Interfaces

O seeder não possui entidades próprias. Ele insere/atualiza registros nas tabelas dos módulos de negócio. A idempotência é garantida por upsert com `onConflict` em campos únicos (email, slug, CNPJ, SKU, etc.).

### Dados de seed por categoria

```typescript
interface SeedPayload {
  company: CompanySeed
  units: UnitSeed[]
  system_users: SystemUserSeed[]
  categories: CategorySeed[]
  brands: BrandSeed[]
  suppliers: SupplierSeed[]
  products: ProductSeed[]
  cost_centers: CostCenterSeed[]
}

// Todos os tipos são subconjuntos dos DTOs de criação dos módulos respectivos
```

### Dados de empresa (seed)

```typescript
CompanySeed {
  cnpj: '00.000.000/0001-00'   // CNPJ de desenvolvimento (não real)
  razao_social: 'Pet Shop Demo LTDA'
  nome_fantasia: 'PetDemo'
  email: 'contato@petdemo.dev'
  telefone: '(11) 99999-0000'
  endereco: { ... }            // dados fictícios
}
```

### Usuários do sistema (seed)

| Role | Email | Senha |
|------|-------|-------|
| ADMINISTRADOR | `admin@petdemo.dev` | `Dev@1234` |
| OPERADOR_ESTOQUE_COMPRAS | `estoque@petdemo.dev` | `Dev@1234` |
| OPERADOR_PDV | `pdv@petdemo.dev` | `Dev@1234` |
| DPO | `dpo@petdemo.dev` | `Dev@1234` |

> Senhas de seed são exclusivas para ambientes de desenvolvimento. O seeder **não executa** em `NODE_ENV=production` a menos que a variável `ALLOW_SEED_IN_PRODUCTION=true` seja explicitamente definida.

### Categorias de seed (pet shop)

- Alimentação → Ração Seca, Ração Úmida, Petiscos
- Saúde → Vermífugos, Antipulgas, Vitaminas
- Higiene → Shampoo, Condicionador, Perfume
- Acessórios → Coleiras, Brinquedos, Camas

### Produtos de seed

Mínimo de 10 produtos distribuídos entre categorias, com:
- Nome, SKU, descrição curta
- Campos fiscais mínimos preenchidos (NCM fictício para pet shop)
- Preço de custo em centavos (invariante: nunca float)
- Referência a marca e categoria

## Endpoints / API Pública

O seeder não expõe endpoints HTTP. É executado via comando CLI:

```bash
# Executar seed completo
pnpm --filter api seed

# Executar seed de categoria específica
pnpm --filter api seed --only=users
pnpm --filter api seed --only=products

# Limpar banco e re-semear (apenas dev)
pnpm --filter api seed --reset
```

Implementado como NestJS CLI Command via `@nestjs/terminus` ou script standalone com acesso ao `AppModule`.

## Regras de Negócio

- **Idempotência total:** o seeder pode ser executado múltiplas vezes sem duplicar dados. Toda inserção usa upsert com `onConflict` ou verificação prévia de existência por campo único.
- **Ordem de execução respeitada:** a ordem segue as dependências: Empresa → Unidades → Usuários → Categorias → Marcas → Fornecedores → Centros de Custo → Produtos.
- **Transação única:** todo o seed roda em uma transação de banco; falha em qualquer etapa faz rollback completo, garantindo estado consistente.
- **Sem dados de produção:** o seeder nunca usa CNPJs reais, CPFs reais ou e-mails de usuários reais. Apenas dados fictícios com sufixo `.dev`.
- **Proteção de ambiente:** verificar `NODE_ENV` antes de executar. Em `production`, exigir flag explícita `ALLOW_SEED_IN_PRODUCTION=true` e logar aviso crítico.
- **Senhas hasheadas:** senhas de usuários de seed são geradas com bcrypt (mesmo custo >= 12 do módulo 23) — nunca plain text no banco.
- **Reset (`--reset`):** apaga dados nas tabelas seedadas (na ordem inversa das FKs) antes de re-inserir. Disponível apenas em `NODE_ENV=development` ou `test`.
- **Seed de testes (unitários/e2e):** módulo de seed é exportável como `SeedService` para ser injetado em suítes de teste que precisam de fixtures reproduzíveis.

## Invariantes Críticos

- **Idempotência:** executar duas vezes o seed produz o mesmo estado final — nunca duplicatas.
- **Bloqueio em produção:** a guarda `if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_SEED_IN_PRODUCTION)` deve existir explicitamente no entry point do seeder.
- **Senhas hasheadas no banco:** nunca inserir senha em plain text, mesmo em seed de desenvolvimento.
- **Dinheiro em centavos:** campos de preço nos produtos de seed devem ser inteiros em centavos (ex: `150000` para R$ 1.500,00), nunca `float`.

## Dependências

- **Upstream (usa):**
  - PostgreSQL — via ORM/query builder do projeto
  - `apps/api/src/common/auth/` — para hash de senha dos usuários de seed
  - Todos os módulos seedados: empresa, unidades, usuários, categorias, marcas, fornecedores, centros de custo, produtos

- **Downstream (usado por):**
  - CI/CD pipeline — seed de banco em ambiente de staging/test
  - Suítes de teste e2e — `SeedService` como fixture de testes
  - Desenvolvedores locais — onboarding rápido sem configuração manual

## Skills Relevantes

- `nestjs-erp-module` — estrutura, injeção de dependência, CLI command do NestJS
- `seguranca-lgpd` — hash de senha, proteção de ambiente, sem dados reais

## Agentes Relevantes

- `revisor-erp` — verificar que seed não usa float para dinheiro e que senhas são hasheadas
- `escritor-de-testes` — usar `SeedService` como base para fixtures de testes e2e

## Critérios de Aceite

- [ ] `pnpm --filter api seed` executado duas vezes: segundo run não cria duplicatas; estado final é idêntico.
- [ ] Banco vazio após `pnpm --filter api seed`: 1 empresa, 1 unidade, 4 usuários de sistema, categorias/subcategorias, marcas, fornecedor e >= 10 produtos estão presentes.
- [ ] Usuário `admin@petdemo.dev` consegue fazer login via `POST /auth/system/login` após seed.
- [ ] Senhas no banco estão hasheadas com bcrypt (nunca plain text).
- [ ] Campos de preço nos produtos de seed são inteiros (centavos); nenhum `float` presente.
- [ ] Executar seed em `NODE_ENV=production` sem `ALLOW_SEED_IN_PRODUCTION=true` aborta com mensagem de erro clara.
- [ ] `pnpm --filter api seed --reset` em `NODE_ENV=development` limpa e re-semeia com sucesso.
- [ ] Falha em qualquer passo do seed faz rollback completo: banco fica no estado anterior.
- [ ] `SeedService` pode ser injetado em testes e2e para popular fixtures de forma programática.
