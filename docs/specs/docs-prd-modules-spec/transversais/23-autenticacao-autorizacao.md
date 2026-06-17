# 23. Autenticação & Autorização

**Domínio:** Transversal & Infraestrutura
**Prioridade:** P0
**Path NestJS:** `apps/api/src/common/auth/`

---

## Responsabilidade

Prover autenticação JWT e controle de acesso baseado em papéis (RBAC) para os dois realms de usuário completamente isolados: sistema (admin/PDV) e e-commerce.

## Entidades / Interfaces

### Realm Sistema (`schema: system`)

```typescript
SystemUser {
  id: uuid
  email: string              // único no realm
  password_hash: string      // bcrypt, custo >= 12
  name: string
  role: SystemRole           // enum
  unidade_id: uuid | null    // null = acesso a todas as unidades (Administrador)
  is_active: boolean
  last_login_at: timestamp | null
  created_at: timestamp
  updated_at: timestamp
}

enum SystemRole {
  ADMINISTRADOR,
  OPERADOR_ESTOQUE_COMPRAS,
  OPERADOR_PDV,
  DPO
}
```

### Realm E-commerce (`schema: ecommerce`)

```typescript
CustomerUser {
  id: uuid
  email: string              // único no realm
  password_hash: string
  name: string
  is_active: boolean
  email_verified_at: timestamp | null
  created_at: timestamp
  updated_at: timestamp
}
```

### Tokens (não persistidos — stateless JWT)

```typescript
SystemAccessToken {
  sub: uuid          // system_user.id
  realm: 'system'
  role: SystemRole
  unidade_id: uuid | null
  iat: number
  exp: number        // curta duração: 15min
}

SystemRefreshToken {
  sub: uuid
  realm: 'system'
  jti: uuid          // ID único do refresh token (para revogação)
  exp: number        // longa duração: 7d
}

CustomerAccessToken {
  sub: uuid          // customer_user.id
  realm: 'ecommerce'
  iat: number
  exp: number        // 15min
}
```

### Refresh Token Store (Redis)

```
Key: refresh_token:{jti}
Value: { user_id, realm, revoked: false }
TTL: 7d
```

## Endpoints / API Pública

### Realm Sistema

| Método | Path | Descrição | Autenticação |
|--------|------|-----------|--------------|
| POST | `/auth/system/login` | Login com email + senha | Pública |
| POST | `/auth/system/refresh` | Renovar access token via refresh token | Pública (refresh token no body) |
| POST | `/auth/system/logout` | Revogar refresh token atual | Bearer (system) |
| GET | `/auth/system/me` | Retorna dados do usuário autenticado | Bearer (system) |
| POST | `/auth/system/users` | Criar usuário do sistema | Bearer (system) + ADMINISTRADOR |
| GET | `/auth/system/users` | Listar usuários do sistema | Bearer (system) + ADMINISTRADOR |
| PATCH | `/auth/system/users/:id` | Atualizar usuário | Bearer (system) + ADMINISTRADOR |
| PATCH | `/auth/system/users/:id/password` | Alterar senha | Bearer (system) + próprio usuário ou ADMINISTRADOR |
| DELETE | `/auth/system/users/:id` | Desativar usuário (soft delete) | Bearer (system) + ADMINISTRADOR |

### Realm E-commerce

| Método | Path | Descrição | Autenticação |
|--------|------|-----------|--------------|
| POST | `/auth/ecommerce/register` | Cadastro de cliente | Pública |
| POST | `/auth/ecommerce/login` | Login do cliente | Pública |
| POST | `/auth/ecommerce/refresh` | Renovar access token | Pública |
| POST | `/auth/ecommerce/logout` | Revogar refresh token | Bearer (ecommerce) |
| GET | `/auth/ecommerce/me` | Dados do cliente autenticado | Bearer (ecommerce) |
| POST | `/auth/ecommerce/verify-email` | Verificar e-mail via token | Pública |
| POST | `/auth/ecommerce/forgot-password` | Solicitar redefinição de senha | Pública |
| POST | `/auth/ecommerce/reset-password` | Redefinir senha via token | Pública |

## Regras de Negócio

- Cada realm tem seu próprio par de chaves JWT (ou secrets separados) — um token de e-commerce nunca valida em um guard de sistema, e vice-versa.
- O `JwtSystemGuard` e o `JwtEcommerceGuard` são guards distintos; nunca usar um guard genérico compartilhado.
- Rota pública é exceção explícita com decorador `@Public()` — o padrão é autenticado.
- RBAC via decorador `@Roles(SystemRole.ADMINISTRADOR)` combinado com `RolesGuard`; sem a declaração de role, qualquer usuário autenticado do realm correto pode acessar.
- Administrador tem acesso a todas as unidades; demais papéis têm acesso restrito à `unidade_id` registrada no token.
- Tentativas de login com credenciais inválidas retornam sempre `401 Unauthorized` com mensagem genérica (não diferenciar "e-mail não encontrado" de "senha incorreta").
- Rate limiting no endpoint de login: máximo 10 tentativas por IP em 1 minuto; bloqueio de 15 minutos após exceder.
- Refresh tokens são single-use com rotação: ao usar um refresh token, o antigo é revogado e um novo é emitido.
- Logout revoga o refresh token no Redis (jti marcado como revogado).
- Senhas armazenadas com bcrypt, custo mínimo 12. Nunca logar ou retornar hashes.
- Tokens de verificação de e-mail e redefinição de senha: UUID gerado, armazenado em Redis com TTL de 1 hora, uso único.

## Invariantes Críticos

- **Isolamento absoluto de realms:** um token emitido para o realm `system` jamais pode ser aceito por um guard do realm `ecommerce`, e vice-versa. Testar explicitamente na suíte de testes.
- **Nenhuma regra de permissão no controller:** RBAC via guards e decoradores, nunca `if (user.role === ...)` no controller ou service de feature.
- **Escopo de unidade no token:** o `unidade_id` vem do token (contexto autenticado), nunca de parâmetro do cliente.
- **Secrets fora do código:** JWT_SYSTEM_SECRET e JWT_ECOMMERCE_SECRET exclusivamente via variáveis de ambiente; nunca em código-fonte ou versionadas.
- **Sem dados de cartão:** este módulo não processa nem armazena dados de pagamento.

## Dependências

- **Upstream (usa):**
  - PostgreSQL — tabelas de usuários nos schemas `system` e `ecommerce`
  - Redis — store de refresh tokens e tokens one-time (verificação de e-mail, reset de senha)
  - `apps/api/src/modules/unidades/` — validação de `unidade_id` no cadastro de usuário
  - Variáveis de ambiente: `JWT_SYSTEM_SECRET`, `JWT_ECOMMERCE_SECRET`, `JWT_ACCESS_TTL`, `JWT_REFRESH_TTL`

- **Downstream (usado por):**
  - Todos os módulos da API via `JwtSystemGuard`, `JwtEcommerceGuard` e `RolesGuard`
  - `apps/api/src/modules/lgpd/` — log de auditoria de autenticação
  - `apps/api/src/modules/clientes/` — identidade do cliente autenticado no e-commerce

## Skills Relevantes

- `seguranca-lgpd` — mandatória: hash de senha, JWT, rate limiting, RBAC, PII, secrets
- `nestjs-erp-module` — estrutura de módulo, guards, decoradores, DTOs

## Agentes Relevantes

- `auditor-seguranca-lgpd` — antes de qualquer release que altere auth ou tokens
- `seguranca-ecommerce` — antes de subir endpoints públicos do realm e-commerce
- `revisor-erp` — após qualquer alteração de código neste módulo

## Critérios de Aceite

- [ ] Login com credenciais válidas no realm sistema retorna access token (15min) e refresh token (7d) com `realm: 'system'` no payload.
- [ ] Login com credenciais válidas no realm e-commerce retorna tokens com `realm: 'ecommerce'` no payload.
- [ ] Um access token de e-commerce apresentado a um endpoint protegido pelo `JwtSystemGuard` retorna `401`.
- [ ] Um access token de sistema apresentado a um endpoint protegido pelo `JwtEcommerceGuard` retorna `401`.
- [ ] Endpoint sem `@Public()` retorna `401` quando chamado sem token.
- [ ] Endpoint com `@Roles(SystemRole.ADMINISTRADOR)` retorna `403` quando chamado por `OPERADOR_PDV`.
- [ ] Após 10 tentativas de login falhas do mesmo IP em 1 minuto, a 11ª retorna `429 Too Many Requests`.
- [ ] Refresh token usado duas vezes: segunda tentativa retorna `401` (token revogado na primeira rotação).
- [ ] Logout invalida o refresh token; tentativa de usar o token revogado retorna `401`.
- [ ] Secrets JWT não aparecem em nenhum arquivo versionado no repositório.
- [ ] Hash de senha armazenado com bcrypt cost >= 12; senha em plain text nunca persiste.
- [ ] `unidade_id` no token de um `OPERADOR_PDV` é respeitado como escopo; não pode ser sobrescrito por parâmetro da requisição.
